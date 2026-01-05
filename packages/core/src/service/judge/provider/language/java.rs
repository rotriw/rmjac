use crate::service::judge::service::{CompileOption, Language};

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