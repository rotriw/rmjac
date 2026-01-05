use crate::service::judge::declare::{CompileOption, Language};
use crate::service::judge::provider::language::cpp::{Cpp, CppStd, O2};

pub struct Java;

impl Language for Java {
    fn export_allow_compile_options(&self) -> Vec<Box<dyn CompileOption>> {
        vec![]
    }

    fn export_name(&self) -> &'static str {
        "Java"
    }

    fn export_compile_name(&self) -> &'static str {
        "javac"
    }
}