use crate::service::judge::declare::{CompileOption, Language};
use crate::service::judge::provider::language::cpp::{Cpp, CppStd, O2};

pub struct Python;

impl Language for Python {
    fn export_allow_compile_options(&self) -> Vec<Box<dyn CompileOption>> {
        vec![]
    }

    fn export_name(&self) -> &'static str {
        "Python"
    }

    fn export_compile_name(&self) -> &'static str {
        "python3"
    }
}