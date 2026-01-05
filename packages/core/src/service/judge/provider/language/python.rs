use crate::service::judge::service::{CompileOption, Language};

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