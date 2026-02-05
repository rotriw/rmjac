#[enum_dispatch::enum_dispatch(JudgeService)]
pub enum Tool {
    Codeforces(CodeforcesJudgeService),
    Atcoder(AtcoderJudgeService),
}

type DJudgeService = dyn JudgeService;

pub fn get_tool(platform: &str) -> Result<Box<DJudgeService>> {
    use crate::service::judge::provider::oj::*;
    match platform {
        "codeforces" => Ok(Box::new(codeforces::default_judge_service())),
        "atcoder" => Ok(Box::new(atcoder::default_judge_service())),
        _ => Err(NotFound(format!(
            "Judge service for platform {} not found.",
            platform
        ))),
    }
}

use crate::Result;
use crate::error::CoreError::NotFound;
use crate::graph::node::user::remote_account::VjudgeNode;
use crate::service::judge::provider::oj::atcoder::AtcoderJudgeService;
use crate::service::judge::provider::oj::codeforces::CodeforcesJudgeService;
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::any::Any;
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubmitContext {
    pub code: String,
    pub user_id: i64,
    pub record_id: i64,
    pub method: String,
}

pub trait CompileOptionValue {
    fn value(&self) -> &str;
    fn show(&self) -> &str {
        self.value()
    }
    fn clone_box(&self) -> Box<dyn CompileOptionValue>;
}

impl Clone for Box<dyn CompileOptionValue> {
    fn clone(&self) -> Box<dyn CompileOptionValue> {
        self.clone_box()
    }
}

#[derive(Clone)]
pub struct StringOption {
    pub value: String,
}

impl CompileOptionValue for StringOption {
    fn value(&self) -> &str {
        self.value.as_str()
    }

    fn clone_box(&self) -> Box<dyn CompileOptionValue> {
        Box::new(self.clone())
    }
}

pub trait CompileOption {
    fn valid(&self, _value: &dyn CompileOptionValue) -> bool {
        true
    }
    fn export_compile_name(&self) -> &str; // --std(gcc choose version)
    fn export_show_name(&self) -> &str {
        self.export_compile_name() // default to compile name.
    }
    fn export_allowed_option(&self) -> Vec<Box<dyn CompileOptionValue>>; // allowed value.

    fn is_compile(&self) -> bool {
        true
    }
    fn is_router(&self) -> bool {
        !self.is_compile()
    }
    fn is_input(&self) -> bool {
        false
    }
}

pub trait Language: Any + Send + Sync {
    fn as_any(&self) -> &dyn Any;
    fn export_allow_compile_options(&self) -> Vec<Box<dyn CompileOption>>;
    fn export_name(&self) -> &str;

    fn export_compile_name(&self) -> &str;

    fn parse_option(
        &self,
        mut options: HashMap<String, Box<dyn CompileOptionValue>>,
    ) -> Vec<(Box<dyn CompileOption>, Box<dyn CompileOptionValue>)> {
        let allowed_options = self.export_allow_compile_options();
        let mut option_choices = Vec::new();
        for option in allowed_options {
            let compile_name = option.export_compile_name();
            if let Some(value) = options.remove(compile_name)
                && option.valid(value.as_ref())
            {
                option_choices.push((option, value));
            }
        }
        option_choices
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct LanguageChoiceOptionsInformation {
    pub name: String,
    pub is_compile: bool,
    pub is_input: bool,              // 是否允许键入值。
    pub allowed_option: Vec<String>, // value.
}

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct LanguageChoiceInformation {
    pub name: String,
    pub allow_option: Vec<LanguageChoiceOptionsInformation>,
}

pub struct ChoiceOption<L> {
    pub option_choices: Vec<(Box<dyn CompileOption>, Box<dyn CompileOptionValue>)>,
    pub language: L,
}

pub trait CompileOptionService {
    fn get_registered_language(&self) -> Vec<Box<dyn Language>>;

    fn export_all_allowed_language(&self) -> Vec<LanguageChoiceInformation> {
        let languages = self.get_registered_language();
        let mut res = Vec::new();
        for language in languages {
            let allowed_options = language.export_allow_compile_options();
            let mut option_info = Vec::new();
            for option in allowed_options {
                let allowed_values = option.export_allowed_option();
                let allowed_value_str = allowed_values
                    .iter()
                    .map(|v| v.value().to_string())
                    .collect();
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
}

pub trait JudgeService {
    fn platform_name(&self) -> &str;

    fn convert_to_json(
        &self,
        value: ChoiceOption<Box<dyn Language>>,
        vjudge_node: VjudgeNode,
        context: SubmitContext,
    ) -> String {
        Json! {
            "operation": "submit",
            "platform": self.platform_name(),
            "vjudge_node": vjudge_node,
            "method": context.method,
            "user_id": context.user_id,
            "context": context,
            "option": {
                "language": value.language.export_name(),
                "compile_options": value.option_choices.iter().map(|(opt, val)| {
                    (opt.export_compile_name(), val.value())
                }).collect::<HashMap<_,_>>()
            }
        }
    }

    fn get_language(&self, language: &str) -> Box<dyn Language> {
        let allowed_language = self.get_compile_option().get_registered_language();
        for i in allowed_language {
            if i.export_name() == language || i.export_compile_name() == language {
                return i;
            }
        }
        Box::new(UnknownLanguage)
    }

    fn get_option(
        &self,
        language: &str,
        options: HashMap<String, Box<dyn CompileOptionValue>>,
    ) -> ChoiceOption<Box<dyn Language>> {
        let lang = self.get_language(language);
        let option_choices = lang.parse_option(options);
        ChoiceOption {
            option_choices,
            language: lang,
        }
    }

    fn parser(&self, shell: &str) -> String {
        let re = Regex::new(r"--(?P<key>[a-zA-Z0-9_]+)=(?P<value>[^\s]+)").unwrap();
        let mut parsed_options = HashMap::new();
        for caps in re.captures_iter(shell) {
            parsed_options.insert(caps["key"].to_string(), caps["value"].to_string());
        }
        let language_name = re.replace_all(shell, "").trim().to_string();

        json!({
            "language": language_name,
            "options": parsed_options
        })
        .to_string()
    }
    fn get_compile_option(&self) -> Box<dyn CompileOptionService>;
}

pub struct UnknownLanguage;
impl Language for UnknownLanguage {
    fn as_any(&self) -> &dyn Any {
        self
    }
    fn export_allow_compile_options(&self) -> Vec<Box<dyn CompileOption>> {
        vec![]
    }

    fn export_compile_name(&self) -> &str {
        "unknown"
    }

    fn export_name(&self) -> &str {
        "unknown"
    }
}
