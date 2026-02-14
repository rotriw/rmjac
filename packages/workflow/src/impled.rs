use crate::plan::{extra_start_points, plan_method};
use crate::workflow::{HistoryStatus, NowStatus, Service, Status, TaskRequire, TaskStatus, Value, WorkflowAction, WorkflowPlanAction, WorkflowSystem};

fn downcast_status<S: Status + Clone>(status: Box<dyn Status>) -> Option<S> {
    status.as_any().downcast_ref::<S>().cloned()
}

impl<T: WorkflowSystem<S>, S: Status + Clone + Default> WorkflowAction<S> for T {
    async fn next(&self, now_status: &NowStatus<S>, service: &Box<dyn Service<S>>) -> Option<NowStatus<S>> {
        if !service.verify(&now_status.init_value).await {
            return None;
        }
        let is_end = service.is_end();
        let mut new_status = service.execute(&now_status.init_value).await.clone();

        // 检查服务是否返回了 Final(Failed) 状态，如果是则立即退出
        if new_status.is_final_failed() {
            let error_msg = new_status.final_error_message()
                .unwrap_or_else(|| "Service execution failed".to_string());
            log::error!("Service '{}' returned failed status: {}", service.get_info().name, error_msg);
            let mut history_value = now_status.history_value.clone();
            history_value.push(HistoryStatus {
                service_name: service.get_info().name,
                output_data: new_status.clone(),
            });
            self.update_execute_status(now_status.task_id?, &NowStatus {
                done: true,
                status: TaskStatus::Failed,
                init_value: new_status.clone(),
                is_lazy: now_status.is_lazy,
                task_id: now_status.task_id,
                history_value: history_value.clone(),
            }).await;
            return Some(NowStatus {
                done: true,
                status: TaskStatus::Failed,
                init_value: new_status,
                is_lazy: now_status.is_lazy,
                task_id: now_status.task_id,
                history_value,
            });
        }

        if service.inherit_status() {
            let merged = now_status.init_value.clone().concat(&new_status.clone_box());
            if let Some(casted) = downcast_status::<S>(merged) {
                new_status = casted;
            }
        }
        let mut history_value = now_status.history_value.clone();
        history_value.push(HistoryStatus {
            service_name: service.get_info().name,
            output_data: new_status.clone()
        });
        let next_status = if is_end { TaskStatus::Success } else { TaskStatus::Running };
        self.update_execute_status(now_status.task_id?, &NowStatus {
            done: is_end,
            status: next_status.clone(),
            init_value: new_status.clone(),
            is_lazy: now_status.is_lazy,
            task_id: now_status.task_id,
            history_value: history_value.clone(),
        }).await;
        Some(NowStatus {
            done: is_end,
            status: next_status,
            init_value: new_status,
            is_lazy: now_status.is_lazy,
            task_id: now_status.task_id,
            history_value,
        })
    }

    async fn next_auto(&self, now_status: &NowStatus<S>, target: &Box<dyn Service<S>>) -> Option<NowStatus<S>> {
        // 检查任务是否已被取消
        if now_status.is_cancelled() {
            log::info!("Task cancelled, stopping execution");
            return None;
        }
        let planed_services = plan_method(self.get_all_services().await, now_status.init_value.clone(), &target.get_info().name).await?;

        if planed_services.is_empty() {
            self.update_execute_status(
                now_status.task_id?,
                &NowStatus {
                    done: true,
                    status: TaskStatus::NoMethod,
                    init_value: now_status.init_value.clone(),
                    is_lazy: now_status.is_lazy,
                    task_id: now_status.task_id,
                    history_value: now_status.history_value.clone(),
                }
            ).await;
            return None;
        }
        log::info!("next service: {}", planed_services[0].get_info().name);
        // used_next.
        self.next(now_status, &planed_services[0]).await
    }

    async fn execute(&self, now_status: &NowStatus<S>, target: Box<dyn Service<S>>) -> Option<NowStatus<S>> {
        let target_name = target.get_info().name;
        let task_id = self.generate_task_id(&target_name).await;
        let mut step = 0;
        let mut status = now_status.clone();
        status.task_id = Some(task_id);
        status.status = TaskStatus::Running;

        // 死循环检测: 追踪连续执行同一服务的次数
        let mut last_service_name: Option<String> = None;
        let mut same_service_count: usize = 0;
        // 追踪 key 集合变化（无进展检测）
        let mut last_key_signature: Option<String> = None;
        let mut stagnant_count: usize = 0;

        loop {
            if step >= Self::MAX_STEP {
                log::error!("Workflow reached MAX_STEP ({}), aborting task {}", Self::MAX_STEP, task_id);
                self.update_execute_status(task_id, &NowStatus {
                    done: true,
                    status: TaskStatus::Failed,
                    init_value: status.init_value.clone(),
                    is_lazy: status.is_lazy,
                    task_id: Some(task_id),
                    history_value: status.history_value.clone(),
                }).await;
                break Some(NowStatus {
                    done: true,
                    status: TaskStatus::Failed,
                    init_value: status.init_value,
                    is_lazy: status.is_lazy,
                    task_id: Some(task_id),
                    history_value: status.history_value,
                });
            }

            if status.is_done() {
                break Some(status);
            }

            let ne_status = self.next_auto(&status, &target).await;
            if ne_status.is_none() {
                break Some(NowStatus {
                    done: true,
                    status: TaskStatus::Failed,
                    init_value: status.init_value,
                    is_lazy: status.is_lazy,
                    task_id: Some(task_id),
                    history_value: status.history_value,
                });
            }
            status = ne_status.unwrap();

            // 终止状态检查
            match status.status {
                TaskStatus::Failed | TaskStatus::Success | TaskStatus::NoMethod => {
                    break Some(status);
                }
                _ => {}
            }

            // 死循环检测 1: 连续执行同一服务
            let current_service = status.history_value.last()
                .map(|h| h.service_name.clone());
            if let Some(ref name) = current_service {
                if last_service_name.as_ref() == Some(name) {
                    same_service_count += 1;
                    if same_service_count >= Self::MAX_REPEAT_SAME_SERVICE {
                        log::error!(
                            "Death loop detected: service '{}' executed {} consecutive times, aborting task {}",
                            name, same_service_count + 1, task_id
                        );
                        self.update_execute_status(task_id, &NowStatus {
                            done: true,
                            status: TaskStatus::Failed,
                            init_value: status.init_value.clone(),
                            is_lazy: status.is_lazy,
                            task_id: Some(task_id),
                            history_value: status.history_value.clone(),
                        }).await;
                        break Some(NowStatus {
                            done: true,
                            status: TaskStatus::Failed,
                            init_value: status.init_value,
                            is_lazy: status.is_lazy,
                            task_id: Some(task_id),
                            history_value: status.history_value,
                        });
                    }
                } else {
                    same_service_count = 0;
                }
                last_service_name = Some(name.clone());
            }

            // 死循环检测 2: key 集合无进展（状态停滞）
            let current_keys = {
                let mut keys: Vec<String> = status.init_value.get_all_value()
                    .iter()
                    .map(|(k, _)| k.clone())
                    .collect();
                keys.sort();
                keys.join("\0")
            };
            if last_key_signature.as_ref() == Some(&current_keys) {
                stagnant_count += 1;
                if stagnant_count >= Self::MAX_REPEAT_SAME_SERVICE {
                    log::error!(
                        "Death loop detected: key set unchanged for {} consecutive steps, aborting task {}",
                        stagnant_count + 1, task_id
                    );
                    self.update_execute_status(task_id, &NowStatus {
                        done: true,
                        status: TaskStatus::Failed,
                        init_value: status.init_value.clone(),
                        is_lazy: status.is_lazy,
                        task_id: Some(task_id),
                        history_value: status.history_value.clone(),
                    }).await;
                    break Some(NowStatus {
                        done: true,
                        status: TaskStatus::Failed,
                        init_value: status.init_value,
                        is_lazy: status.is_lazy,
                        task_id: Some(task_id),
                        history_value: status.history_value,
                    });
                }
            } else {
                stagnant_count = 0;
            }
            last_key_signature = Some(current_keys);

            step += 1;
        }
    }
}

impl Value for serde_json::Value {
    fn get_type(&self) -> String {
        match self {
            serde_json::Value::Null => "null".to_string(),
            serde_json::Value::Bool(_) => "bool".to_string(),
            serde_json::Value::Number(_) => "number".to_string(),
            serde_json::Value::String(_) => "string".to_string(),
            serde_json::Value::Array(_) => "array".to_string(),
            serde_json::Value::Object(_) => "object".to_string(),
        }
    }
    fn to_string(&self) -> String {
        serde_json::to_string(self).unwrap()
    }
}

impl Status for serde_json::Value {
    fn add_value(&self, key: &str, value: Box<dyn Value>) -> Box<dyn Status> {
        let mut new_obj = self.as_object().cloned().unwrap_or_default();
        new_obj.insert(key.to_string(), serde_json::from_str(&value.to_string()).unwrap());
        Box::new(serde_json::Value::Object(new_obj))
    }

    fn as_any(&self) -> &dyn std::any::Any {
        self
    }

    fn get_value(&self, key: &str) -> Option<Box<dyn Value>> {
        match self.get(key) {
            Some(v) => Some(Box::new(v.clone())),
            None => None,
        }
    }

    fn get_all_value(&self) -> Vec<(String, Box<dyn Value>)> {
        let mut res: Vec<(String, Box<dyn Value>)> = vec![];
        if let Some(obj) = self.as_object() {
            for (k, v) in obj {
                res.push((k.clone(), Box::new(v.clone())));
            }
        }
        res
    }
}

impl<T: WorkflowSystem<S>, S: Status + Clone> WorkflowPlanAction<S> for T {
    async fn get_required_input(&self, target: &str) -> Vec<TaskRequire> {
        let service = self.get_service(target).await;
        let all_services = self.get_all_services().await;
        for s in &all_services {
            log::debug!("Available service for planning: {}", s.get_info().name);
        }
        log::info!("Planning required input for target service: {}", target);
        let Some(service) = service else {
            log::debug!("No service found for {}", target);
            return vec![];
        };

        let mut res = vec![TaskRequire {
            start_service_info: service.get_info(),
            require: service.get_import_require(),
            route_describe: target.to_string(),
        }];

        let mut extra = extra_start_points(all_services, target, target).await;
        res.append(&mut extra);
        res
    }

}