use crate::service::judge::service::{JudgeService, Language};
use crate::service::judge::service::CompileOptionService;
use std::collections::HashMap;
use macro_node_iden::option_service;
use crate::service::judge::service::{ChoiceOption, CompileOption, CompileOptionValue};

#[derive(PartialOrd, PartialEq)]
pub struct PID;
#[derive(PartialOrd, PartialEq)]
pub struct O2;

impl CompileOption for PID {
    fn valid(&self, value: &dyn CompileOptionValue) -> bool {
        let value = value.value();
        value.len() <= 7 && value.chars().all(|c| c.is_ascii_digit())
    }

    fn export_compile_name(&self) -> &'static str {
        "p_id"
    }

    fn export_show_name(&self) -> &'static str {
        "Problem ID"
    }

    fn export_allowed_option(&self) -> Vec<Box<dyn CompileOptionValue>> {
        vec![]
    }

    fn is_compile(&self) -> bool {
        false
    }

    fn is_input(&self) -> bool {
        true
    }
}


impl CompileOption for O2 {
    fn export_compile_name(&self) -> &'static str {
        "O2"
    }

    fn export_show_name(&self) -> &'static str {
        "O2 Optimization"
    }

    fn export_allowed_option(&self) -> Vec<Box<dyn CompileOptionValue>> {
        vec![]
    }
}


option_service! {
    platform: "luogu",
    options: [PID, O2],
    service: LuoguCompileService,
    language_id: LuoguLanguage,
    export: LuoguJudgeData {
        problem_id: String,
        o2: bool,
    },
    default_language: list_language!{
        show_name order,
        "自动识别语言" 1,
        "Pascal" 2,
        "C" 3,
        "C++14 (GCC 9)" 4,
        "C++98" 5,
        "C++11" 6,
        "C++14" 7,
        "C++17" 8,
        "C++20" 9,
        "C++23" 10,
        "Python 3" 11,
        "PyPy 3" 12,
        "Java 8" 13,
        "Java 21" 14,
        "Rust" 15,
        "Go" 16,
        "Haskell" 17,
        "OCaml" 18,
        "Julia" 19,
        "Lua" 20,
        "Kotlin/JVM" 21,
        "Scala" 22,
        "C# Mono" 23,
        "Node.js LTS" 24,
        "PHP" 25,
        "Ruby" 26,
        "Perl" 27,
    },
    export_data: convert
}

pub struct LuoguJudgeService {
    compile: LuoguCompileService,
}
impl JudgeService for LuoguJudgeService {
    fn platform_name(&self) -> &'static str {
        "luogu"
    }
    fn get_compile_option(&self) -> Box<dyn CompileOptionService> {
        Box::new(self.compile.clone())
    }
}

pub fn default_judge_service() -> impl JudgeService {
    let compile = default_compile_service();
    LuoguJudgeService { compile }
}


pub fn convert(option: ChoiceOption<LuoguLanguage>) -> LuoguJudgeData {
    let mut problem_id = "".to_string();
    let mut o2 = false;
    for (option, v) in option.option_choices {
        if option.export_compile_name() == "O2" {
            o2 = v.value() == "true";
        } else if option.export_compile_name() == "Problem ID" {
            problem_id = v.value().to_string();
        }
    }
    LuoguJudgeData {
        problem_id,
        o2
    }
}