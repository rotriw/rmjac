#![feature(super_let)]
#![allow(dead_code)]

use command_tool::generate_commands;

generate_commands! {
    src="src/command",
    exec_func="exec",
}

pub mod command;
#[macro_use]
pub mod utils;
pub mod env;
pub mod handler;

fn main() {
    exec();
}
