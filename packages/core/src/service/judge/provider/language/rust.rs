use crate::service::judge::declare::{CompileOption, CompileOptionValue, Language};

pub struct Rust;

pub struct RustVersion;
pub struct OptLevel;

pub struct Opts {
    value: &'static str,
}


impl CompileOptionValue for Opts {
    fn value(&self) -> &'static str {
        self.value
    }
}
impl CompileOption for RustVersion {
    fn export_compile_name(&self) -> &'static str {
        "--edition"
    }

    fn export_show_name(&self) -> &'static str {
        "Rust Edition"
    }

    fn export_allowed_option(&self) -> Vec<Box<dyn CompileOptionValue>> {
        let allowed_std = ["2024"];
        let mut result: Vec<Box<dyn CompileOptionValue>> = vec![];
        for std in allowed_std.iter() {
            result.push(Box::new(Opts { value: std }));
        }
        result
    }
}
impl CompileOption for OptLevel {
    fn export_compile_name(&self) -> &'static str {
        "-C opt-level"
    }

    fn export_show_name(&self) -> &'static str {
        "Rust Edition"
    }

    fn export_allowed_option(&self) -> Vec<Box<dyn CompileOptionValue>> {
        let allowed_std = ["0", "1", "2", "3", "s", "z"];
        let mut result: Vec<Box<dyn CompileOptionValue>> = vec![];
        for std in allowed_std.iter() {
            result.push(Box::new(Opts { value: std }));
        }
        result
    }
}

impl Language for Rust {
    fn export_allow_compile_options(&self) -> Vec<Box<dyn CompileOption>> {
        vec![Box::new(RustVersion {}), Box::new(OptLevel {})]
    }

    fn export_name(&self) -> &'static str {
        "Rust"
    }

    fn export_compile_name(&self) -> &'static str {
        "rustc"
    }
}