option_service! {
    platform: "codeforces",
    options: [ContestID, ProblemID],
    service: CodeforcesCompileService,
    language_id: CodeforcesLanguage,
    export: CodeforcesJudgeData {
        url: String,
        select_id: i64,
    },
    default_language: list_language!{
        show_name language_id,
        "GNU GCC C11 5.1.0" 43,
        "GNU G++17 7.3.0" 54,
        "GNU G++20 13.2 (64 bit, winlibs)" 89,
        "GNU G++23 14.2 (64 bit, msys2)" 91,
        "C# 8, .NET Core 3.1" 65,
        "C# 10, .NET SDK 6.0" 79,
        "C# 13, .NET SDK 9" 96,
        "C# Mono 6.8" 9,
        "D DMD32 v2.105.0" 28,
        "F# 9, .NET SDK 9" 97,
        "Go 1.22.2" 32,
        "Haskell GHC 8.10.1" 12,
        "Java 21 64bit" 87,
        "Java 8 32bit" 36,
        "Kotlin 1.7.20" 83,
        "Kotlin 1.9.21" 88,
        "Kotlin 2.2.0" 99,
        "OCaml 4.02.1" 19,
        "Delphi 7" 3,
        "Free Pascal 3.2.2" 4,
        "PascalABC.NET 3.8.3" 51,
        "Perl 5.20.1" 13,
        "PHP 8.1.7" 6,
        "Python 2.7.18" 7,
        "Python 3.13.2" 31,
        "PyPy 2.7.13 (7.3.0)" 40,
        "PyPy 3.6.9 (7.3.0)" 41,
        "PyPy 3.10 (7.3.15, 64bit)" 70,
        "Ruby 3.2.2" 67,
        "Rust 1.89.0 (2021)" 75,
        "Rust 1.89.0 (2024)" 98,
        "Scala 2.12.8" 20,
        "JavaScript V8 4.8.0" 34,
        "Node.js 15.8.0 (64bit)" 55,
    },
    export_data: convert
}

pub struct CodeforcesJudgeService {
    pub compile: CodeforcesCompileService,
}
impl JudgeService for CodeforcesJudgeService {
    fn platform_name(&self) -> &str {
        "codeforces"
    }

    fn convert_to_json(
        &self,
        value: ChoiceOption<Box<dyn Language>>,
        vjudge_node: VjudgeNode,
        context: SubmitContext,
    ) -> String {
        let data = self.compile.export_data(ChoiceOption {
            option_choices: value.option_choices,
            language: *value
                .language
                .as_any()
                .downcast_ref::<CodeforcesLanguage>()
                .unwrap(),
        });
        json!({
            "operation": "submit",
            "platform": "codeforces",
            "vjudge_node": vjudge_node,
            "url": data.url,
            "context": context,
            "language_id": data.select_id,
        })
        .to_string()
    }

    fn get_compile_option(&self) -> Box<dyn CompileOptionService> {
        Box::new(self.compile.clone())
    }
}

pub fn convert(option: ChoiceOption<CodeforcesLanguage>) -> CodeforcesJudgeData {
    let mut url = "https://codeforces.com".to_string();
    let mut contest_id = "".to_string();
    let mut problem_id = "".to_string();
    for (option, v) in option.option_choices {
        if option.export_show_name() == "Contest ID" {
            contest_id = v.value().to_string();
        } else if option.export_show_name() == "Problem ID" {
            problem_id = v.value().to_string();
        }
    }
    if !contest_id.is_empty() && !problem_id.is_empty() {
        if contest_id.len() <= 4 {
            url = format!("{}/contest/{}/problem/{}", url, contest_id, problem_id);
        } else {
            url = format!("{}/gym/{}/problem/{}", url, contest_id, problem_id);
        }
    }
    CodeforcesJudgeData {
        url,
        select_id: option.language.language_id,
    }
}

#[derive(PartialOrd, PartialEq)]
pub struct ContestID;
#[derive(PartialOrd, PartialEq)]
pub struct ProblemID;

impl CompileOption for ContestID {
    fn valid(&self, value: &dyn CompileOptionValue) -> bool {
        let value = value.value();
        value.len() <= 7 && value.chars().all(|c| c.is_ascii_digit())
    }

    fn export_compile_name(&self) -> &'static str {
        "--c_id="
    }

    fn export_show_name(&self) -> &'static str {
        "Contest ID"
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

impl CompileOption for ProblemID {
    fn valid(&self, value: &dyn CompileOptionValue) -> bool {
        let value = value.value();
        value.len() <= 3
            && value
                .chars()
                .all(|c| c.is_ascii_digit() || c.is_ascii_uppercase())
    }

    fn export_compile_name(&self) -> &'static str {
        "--p_id="
    }

    fn export_show_name(&self) -> &'static str {
        "Problem ID"
    }

    fn export_allowed_option(&self) -> Vec<Box<dyn CompileOptionValue>> {
        vec![]
    }

    fn is_input(&self) -> bool {
        true
    }
}

pub fn default_judge_service() -> impl JudgeService {
    let compile = default_compile_service();
    CodeforcesJudgeService { compile }
}

use crate::graph::node::user::remote_account::VjudgeNode;
use crate::service::judge::service::{
    ChoiceOption, CompileOption, CompileOptionService, CompileOptionValue, JudgeService, Language,
    SubmitContext,
};
use macro_node_iden::option_service;
use serde_json::json;
use std::collections::HashMap;
