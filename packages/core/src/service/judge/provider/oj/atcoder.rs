use crate::graph::node::user::remote_account::VjudgeNode;
use crate::service::judge::service::{
    ChoiceOption, CompileOption, CompileOptionService, CompileOptionValue, JudgeService, Language,
    SubmitContext,
};
use macro_node_iden::option_service;
use serde_json::json;
use std::collections::HashMap;

#[derive(PartialOrd, PartialEq)]
pub struct ContestID;
#[derive(PartialOrd, PartialEq)]
pub struct ProblemID;

impl CompileOption for ContestID {
    fn valid(&self, value: &dyn CompileOptionValue) -> bool {
        let value = value.value();
        value.len() <= 10 && value.chars().all(|c| c.is_ascii_alphanumeric() || c == '_')
    }

    fn export_compile_name(&self) -> &'static str {
        "c_id"
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
        value.len() <= 10 && value.chars().all(|c| c.is_ascii_alphanumeric() || c == '_')
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

    fn is_input(&self) -> bool {
        true
    }
}

option_service! {
    platform: "atcoder",
    options: [ContestID, ProblemID],
    service: AtCoderCompileService,
    language_id: AtCoderLanguage,
    export: AtCoderJudgeData {
        url: String,
        select_id: i64,
    },
    default_language: list_language!{
        show_name select_id,
        "><> (fishr 0.1.0)" 6001,
        "Ada 2022 (GNAT 15.2.0)" 6002,
        "APL (GNU APL 1.9)" 6003,
        "Assembly MIPS O32 ABI (GNU assembler 2.42)" 6004,
        "Assembly x64 (NASM 2.16.03)" 6005,
        "AWK (GNU awk 5.2.1)" 6006,
        "A言語 (interpreter af48a2a)" 6007,
        "Bash (bash 5.3)" 6008,
        "BASIC (FreeBASIC 1.10.1)" 6009,
        "bc (GNU bc 1.08.2)" 6010,
        "Befunge93 (TBC 1.0)" 6011,
        "Brainfuck (Tritium 1.2.73)" 6012,
        "C23 (Clang 21.1.0)" 6013,
        "C23 (GCC 14.2.0)" 6014,
        "C# 13.0 (.NET 9.0.8)" 6015,
        "C# 13.0 (.NET Native AOT 9.0.8)" 6016,
        "C++23 (GCC 15.2.0)" 6017,
        "C3 (c3c 0.7.5)" 6018,
        "Carp(Carp 0.5.5)" 6019,
        "cLay (cLay 20250308-1 (GCC 15.2.0))" 6020,
        "Clojure (babashka 1.12.208)" 6021,
        "Clojure (clojure 1.12.2)" 6022,
        "Clojure (Clojure AOT 1.12.2)" 6023,
        "Clojure (ClojureScript 1.12.42 (Clojure 1.12.2 Node.js 22.19.0))" 6025,
        "COBOL (Free) (GnuCOBOL 3.2)" 6026,
        "Common Lisp (SBCL 2.5.8)" 6027,
        "Crystal (Crystal 1.17.0)" 6028,
        "Cyber (Cyber v0.3)" 6029,
        "D (DMD 2.111.0)" 6030,
        "D (GDC 15.2)" 6031,
        "D (LDC 1.41.0)" 6032,
        "Dart (Dart 3.9.2)" 6033,
        "dc 1.5.2 (GNU bc 1.08.2)" 6034,
        "ECLiPSe (ECLiPSe 7.1_13)" 6035,
        "Eiffel (Gobo Eiffel 22.01)" 6036,
        "Eiffel (Liberty Eiffel 07829e3)" 6037,
        "Elixir (Elixir 1.18.4 (OTP 28.0.2))" 6038,
        "Emacs Lisp(Native Compile)(GNU Emacs 29.4)" 6039,
        "Emojicode 1.0 beta 2 (emojicodec 1.0 beta 2)" 6040,
        "Erlang (Erlang 28.0.2)" 6041,
        "F# 9.0 (.NET 9.0.8)" 6042,
        "Factor (Factor 0.100)" 6043,
        "Fish (fish 4.0.2)" 6044,
        "Forth (gforth 0.7.3)" 6045,
        "Fortran2018 (Flang 20.1.7)" 6046,
        "Fortran2023 (GCC 14.2.0)" 6047,
        "FORTRAN77 (GCC 14.2.0)" 6048,
        "Gleam (Gleam 1.12.0 (OTP 28.0.2))" 6049,
        "Go 1.18 (gccgo 15.2.0)" 6050,
        "Go (go 1.25.1)" 6051,
        "Haskell (GHC 9.8.4)" 6052,
        "Haxe/JVM 4.3.7 (hxjava 4.2.0)" 6053,
        "C++ IOI-Style(GNU++20) (GCC 14.2.0)" 6054,
        "ISLisp (Easy-ISLisp 5.43)" 6055,
        "Java24 (OpenJDK 24.0.2)" 6056,
        "JavaScript (Bun 1.2.21)" 6057,
        "JavaScript (Deno 2.4.5)" 6058,
        "JavaScript (Node.js 22.19.0)" 6059,
        "Jule (jule 0.1.6)" 6060,
        "Koka (koka v3.2.2)" 6061,
        "Kotlin (Kotlin/JVM 2.2.10)" 6062,
        "Kuin (kuincl v.2021.8.17)" 6063,
        "Lazy K (irori v1.0.0)" 6064,
        "Lean (lean v4.22.0)" 6065,
        "LLVM IR (Clang 21.1.0)" 6066,
        "Lua (Lua 5.4.7)" 6067,
        "Lua (LuaJIT 2.1.1703358377)" 6068,
        "Mercury (Mercury 22.01.8)" 6069,
        "Nim (Nim 1.6.20)" 6071,
        "Nim (Nim 2.2.4)" 6072,
        "OCaml (ocamlopt 5.3.0)" 6073,
        "Octave (GNU Octave 10.2.0)" 6074,
        "Pascal (fpc 3.2.2)" 6075,
        "Perl (perl 5.38.2)" 6076,
        "PHP (PHP 8.4.12)" 6077,
        "Piet (your-diary/piet_programming_language 3.0.0) (PPM image)" 6078,
        "Pony (ponyc 0.59.0)" 6079,
        "PowerShell (PowerShell 7.5.2)" 6080,
        "Prolog (SWI-Prolog 9.2.9)" 6081,
        "Python (CPython 3.13.7)" 6082,
        "Python (PyPy 3.11-v7.3.20)" 6083,
        "R (GNU R 4.5.0)" 6084,
        "ReasonML (reson 3.16.0)" 6085,
        "Ruby 3.3 (truffleruby 25.0.0)" 6086,
        "Ruby 3.4 (ruby 3.4.5)" 6087,
        "Rust (rustc 1.89.0)" 6088,
        "SageMath (SageMath 10.7)" 6089,
        "Scala (Dotty 3.7.2)" 6090,
        "Scala 3.7.2 (Scala Native 0.5.8)" 6091,
        "Scheme (ChezScheme 10.2.0)" 6092,
        "Scheme (Gauche 0.9.15)" 6093,
        "Seed7 (Seed7 3.5.0)" 6094,
        "Swift 6.2" 6095,
        "Tcl (tclsh 9.0.1)" 6096,
        "Terra (Terra 1.2.0)" 6097,
        "TeX (tex 3.141592653)" 6098,
        "Text (cat 9.4)" 6099,
        "TypeScript 5.8 (Deno 2.4.5)" 6100,
        "TypeScript 5.9 (tsc 5.9.2 (Bun 1.2.21))" 6101,
        "TypeScript 5.9 (tsc 5.9.2 (Node.js 22.19.0))" 6102,
        "Uiua (uiua 0.16.2)" 6103,
        "Unison (Unison 0.5.47)" 6104,
        "V (0.4.10)" 6105,
        "Vala (valac 0.56.18)" 6106,
        "Verilog 2012 (Icarus Verilog 12.0)" 6107,
        "Veryl (veryl 0.16.4)" 6108,
        "WebAssembly (wabt 1.0.34 + iwasm 2.4.1)" 6109,
        "Whitespace (whitespacers 1.3.0)" 6110,
        "Zig (Zig 0.15.1)" 6111,
        "なでしこ (cnako3 3.7.8 (Node.js 22.19.0))" 6112,
        "プロデル (mono版プロデル 2.0.1353)" 6113,
        "Julia (Julia 1.11.6)" 6114,
        "Python (Codon 0.19.3)" 6115,
        "C++23 (Clang 21.1.0)" 6116,
        "Fix (1.1.0-alpha.12)" 6117,
        "SQL (DuckDB 1.3.2)" 6118,
    },
    export_data: convert
}

pub struct AtcoderJudgeService {
    compile: AtCoderCompileService,
}
impl JudgeService for AtcoderJudgeService {
    fn platform_name(&self) -> &'static str {
        "atcoder"
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
                .downcast_ref::<AtCoderLanguage>()
                .unwrap(),
        });
        json!({
            "operation": "submit",
            "platform": "atcoder",
            "vjudge_node": vjudge_node,
            "method": context.method,
            "user_id": context.user_id,
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

pub fn default_judge_service() -> impl JudgeService {
    let compile = default_compile_service();
    AtcoderJudgeService { compile }
}

pub fn convert(option: ChoiceOption<AtCoderLanguage>) -> AtCoderJudgeData {
    let mut url = "https://atcoder.jp".to_string();
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
        url =
            format!("{url}/contests/{contest_id}/submit/?taskScreenName={contest_id}_{problem_id}");
    }
    AtCoderJudgeData {
        url,
        select_id: option.language.select_id,
    }
}
