use std::collections::HashMap;
use std::hash::Hash;
use serde::{Deserialize, Serialize};
use regex::Regex;
use serde_json::json;
use crate::graph::node::user::remote_account::VjudgeNode;
use crate::service::socket::service::add_task;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubmitContext {
    pub code: String
}

pub trait CompileOptionValue {
    fn value(&self) -> &str;
    fn show(&self) -> &str {
        self.value()
    }
}

pub struct StringOption {
    pub value: String,
}

impl CompileOptionValue for StringOption {
    fn value(&self) -> &str {
        self.value.as_str()
    }

}


pub trait CompileOption {
    fn valid(&self, _value: &str) -> bool {
        false
    }
    fn export_compile_name(&self) -> &'static str; // --std(gcc choose version)
    fn export_show_name(&self) -> &'static str {
        self.export_compile_name() // default to compile name.
    }
    fn export_allowed_option(&self) -> Vec<Box<dyn CompileOptionValue>>; // allowed value.


    fn is_compile(&self) -> bool { true }
    fn is_router(&self) -> bool {
        !self.is_compile()
    }
    fn is_input(&self) -> bool { false }

}


pub trait Language {
    fn export_allow_compile_options(&self) -> Vec<Box<dyn CompileOption>>;
    fn export_name(&self) -> &'static str;

    fn export_compile_name(&self) -> &'static str;
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LanguageChoiceOptionsInformation {
    pub name: String,
    pub is_compile: bool,
    pub is_input: bool, // 是否允许键入值。
    pub allowed_option: Vec<String>, // value.
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LanguageChoiceInformation {
    pub name: String,
    pub allow_option: Vec<LanguageChoiceOptionsInformation>,
}


pub struct ChoiceOption<L> {
    pub option_choices: Vec<(Box<dyn CompileOption>, Box<dyn CompileOptionValue>)>,
    pub language: L,
}

pub trait CompileOptionService<L> where L: Language {
    fn get_registered_language(&self) -> Vec<L>;
    type R;

    fn export_all_allowed_language(&self) -> Vec<LanguageChoiceInformation> {
        let languages = self.get_registered_language();
        let mut res = Vec::new();
        for language in languages {
            let allowed_options = language.export_allow_compile_options();
            let mut option_info = Vec::new();
            for option in allowed_options {
                let allowed_values = option.export_allowed_option();
                let allowed_value_str = allowed_values.iter().map(|v| v.value().to_string()).collect();
                option_info.push(LanguageChoiceOptionsInformation {
                    name: option.export_compile_name().to_string(),
                    allowed_option: allowed_value_str,
                    is_compile: option.is_compile(),
                    is_input: option.is_input(),
                });
            }
            res.push(LanguageChoiceInformation {
                name: language.export_name().to_string(),
                allow_option: option_info,
            });
        }
        res
    }

    fn export_data(&self, choice: ChoiceOption<L>) -> Self::R;
}



pub trait JudgeService<S, L> where S: CompileOptionService<L>, L: Language {


    fn platform_name(&self) -> &'static str;

    fn convert_to_json(&self, value: S::R, vjudge_node: VjudgeNode, context: SubmitContext) -> String;

    fn parser(&self, language: &str, options: HashMap<String, String>, vjudge_node: VjudgeNode, context: SubmitContext) -> String {
        let allowed_language = self.get_compile_option().get_registered_language();
        for i in allowed_language {
            if i.export_name() == language || i.export_compile_name() == language {
                let mut parsed_options:Vec<(Box<dyn CompileOption>, Box<dyn CompileOptionValue>)> = Vec::new();
                let allowed_options = i.export_allow_compile_options();
                for (option) in allowed_options {
                    if let Some(v) = &options.get(option.export_compile_name()) {
                        match (option.is_input(), option.valid(v), option.export_allowed_option()) {
                            (false, _, ao) => {
                                for allowed in ao {
                                    if allowed.value() == v.as_str() {
                                        parsed_options.push((option, allowed));
                                        break;
                                    }
                                }
                            },
                            (true, true, _) => {
                                parsed_options.push((option, Box::new(StringOption {
                                    value: (*v).clone()
                                })));
                            }
                            _ => {}
                        }
                    }
                }
                let choice = ChoiceOption {
                    option_choices: parsed_options,
                    language: i
                };

                return self.convert_to_json(self.get_compile_option().export_data(choice), vjudge_node, context);
            }
        }
        "Invalid language.".to_string()
    }


    fn send_judge_task(&self, language: &str, options: HashMap<String, String>, vjudge_node: VjudgeNode, context: SubmitContext) -> impl Future<Output = bool> {
        async {
            log::debug!("create judge task {} {:?}", self.platform_name(), options);
            add_task(&self.parser(language, options, vjudge_node, context)).await
        }
    }

    fn get_compile_option(&self) -> &S;
}