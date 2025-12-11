use crate::Result;
use crate::error::CoreError;
use crate::graph::node::record::RecordStatus;
use crate::graph::node::record::subtask::SubtaskCalcMethod;
use deno_core::RuntimeOptions;
use deno_core::v8;
use deno_core::{JsRuntime, serde_v8};
use serde::{Deserialize, Serialize};
use serde_json::json;

type TaskScore = f64;
type TaskTime = i64; // ms
type TaskMemory = i64; // KB
type TaskDetail = (TaskScore, TaskTime, TaskMemory, RecordStatus);

pub fn handle_score(
    method: SubtaskCalcMethod,
    calc_function: Option<String>,
    task_detail: Vec<TaskDetail>,
) -> Result<TaskDetail> {
    log::trace!("Calculating score using method: {:?} {:?} {:?}", method, calc_function, task_detail);
    use crate::graph::node::record::RecordStatus::*;
    use SubtaskCalcMethod::*;
    match method {
        Max => {
            let (mut score, mut time, mut memory, mut status) = (0f64, 0, 0, Accepted);
            for (s, t, m, r) in task_detail {
                if s > score {
                    score = s;
                }
                if t > time {
                    time = t;
                }
                if m > memory {
                    memory = m;
                }
                if r != Accepted && status == Accepted {
                    status = r;
                }
            }
            Ok((score, time, memory, status))
        }
        Min => {
            let (mut score, mut time, mut memory, mut status) = (-1f64, -1, -1, Accepted);
            for (s, t, m, r) in task_detail {
                if s < score || score as i32 == -1 {
                    score = s;
                }
                if t < time || time == -1 {
                    time = t;
                }
                if m < memory || time == -1 {
                    memory = m;
                }
                if r != Accepted && status == Accepted {
                    status = r;
                }
            }
            Ok((
                if score as i32 == -1 {
                    0f64
                } else {
                    score
                },
                if time == -1 { 0 } else { time },
                if memory == -1 { 0 } else { memory },
                if time == -1 { UnknownError } else { status },
            ))
        }
        Sum => {
            let (mut score, mut time, mut memory, mut status) = (0f64, 0, 0, Accepted);
            for (s, t, m, r) in task_detail {
                score += s;
                time += t;
                memory += m;
                if r != Accepted && status == Accepted {
                    status = r;
                }
            }
            Ok((score, time, memory, status))
        }
        Function => {
            log::trace!("Using custom function for score calculation");
            #[derive(Serialize, Deserialize, Debug, Clone)]
            struct TaskDetailObject {
                score: TaskScore,
                time: TaskTime,
                memory: TaskMemory,
                status: String,
            }
            let mut runtime = JsRuntime::new(RuntimeOptions::default());
            let default_code = r#"
                function calculateScore(detail) {
                    let score = 0;
                    let time = 0;
                    let memory = 0;
                    let status = "Accepted";
                    for (let i = 0; i < detail.length; i++) {
                        const item = detail[i];
                        score += item.score;
                        time += item.time;
                        memory += item.memory;
                        if (item.status !== "Accepted" && status === "Accepted") {
                            status = item.status;
                        }
                    }
                    return {
                        score,
                        time,
                        memory,
                        status
                    };
            } calculateScore(detail);"#;
            let result = eval(
                &mut runtime,
                format!(r#"
                let detail = {};
                let now_time = {};
                {}
            "#,
                    json!(
                        task_detail.iter().map(|(s, t, m, r)| {
                            TaskDetailObject {
                                score: *s,
                                time: *t,
                                memory: *m,
                                status: r.to_string(),
                            }
                        }).collect::<Vec<_>>()
                    ),
                    now_time!().and_utc().timestamp(),
                    calc_function.unwrap_or(default_code.to_string())
                ),
            )?;
            dbg!(&result);
            if let Some(result) = result.as_object()
                && let Some(score) = result.get("score")
                && let Some(score) = score.as_f64()
                && let Some(time) = result.get("time")
                && let Some(time) = time.as_i64()
                && let Some(memory) = result.get("memory")
                && let Some(memory) = memory.as_i64()
                && let Some(status) = result.get("status")
                && let Some(status) = status.as_str()
            {
                Ok((score, time, memory, status.to_string().into()))
            } else {
                Err(CoreError::InvalidFunction(
                    "Invalid result from custom function".to_string(),
                ))
            }
        }

    }
}

fn eval(context: &mut JsRuntime, code: String) -> Result<serde_json::Value> {
    let res = context.execute_script("<anon>", code);
    match res {
        Ok(global) => {
            let scope = &mut context.handle_scope();
            let local = v8::Local::new(scope, global);
            let deserialized_value = serde_v8::from_v8::<serde_json::Value>(scope, local);
            match deserialized_value {
                Ok(value) => Ok(value),
                Err(_err) => Err(CoreError::InvalidFunction(
                    "Failed to deserialize v8 value".to_string(),
                )),
            }
        }
        Err(err) => Err(CoreError::InvalidFunction(format!(
            "Failed to execute script: {}",
            err
        ))),
    }
}