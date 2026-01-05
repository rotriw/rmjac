use crate::service::judge::declare::{CompileOption, CompileOptionValue, Language};

pub struct Cpp;


pub struct CppStandard {
    standard: &'static str,
}

pub struct CppStd;
pub struct O2;

impl CompileOptionValue for CppStandard {
    fn value(&self) -> &'static str {
        self.standard
    }
}


impl CompileOption for CppStd {
    fn export_compile_name(&self) -> &'static str {
        "--std"
    }

    fn export_show_name(&self) -> &'static str {
        "C++ ISO Standard"
    }

    fn export_allowed_option(&self) -> Vec<Box<dyn CompileOptionValue>> {
        let allowed_std = ["c++98", "c++11", "c++14", "c++17", "c++20"];
        let mut result: Vec<Box<dyn CompileOptionValue>> = vec![];
        for std in allowed_std.iter() {
            result.push(Box::new(CppStandard { standard: std }));
        }
        result
    }
}

impl CompileOption for O2 {
    fn export_compile_name(&self) -> &'static str {
        "--O2"
    }

    fn export_show_name(&self) -> &'static str {
        "O2 Optimization"
    }

    fn export_allowed_option(&self) -> Vec<Box<dyn CompileOptionValue>> {
        vec![]
    }
}

impl Language for Cpp {
    fn export_allow_compile_options(&self) -> Vec<Box<dyn CompileOption>> {
        vec![Box::new(CppStd {}), Box::new(O2 {})]
    }

    fn export_name(&self) -> &'static str {
        "C++"
    }

    fn export_compile_name(&self) -> &'static str {
        "g++"
    }
}