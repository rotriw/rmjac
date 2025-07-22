use colored::Colorize;
use fern::Output;
use log::{self, LevelFilter};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct LogData {
    pub level: String,
    pub target: String,
    pub message: String,
    pub time: String,
}

pub fn get_color(level: log::Level) -> colored::Color {
    match level {
        log::Level::Trace => colored::Color::White,
        log::Level::Debug => colored::Color::Blue,
        log::Level::Info => colored::Color::Green,
        log::Level::Warn => colored::Color::Yellow,
        log::Level::Error => colored::Color::Red,
    }
}

pub fn setup_logger_with_stdout(level: LevelFilter) -> Result<(), fern::InitError> {
    fern::Dispatch::new()
        .format(|out, message, record| {
            out.finish(format_args!(
                "[{} {} {}] {}",
                chrono::Local::now()
                    .format("%Y-%m-%d %H:%M:%S%.3f")
                    .to_string()
                    .as_str()
                    .magenta(),
                record.level().as_str().color(get_color(record.level())),
                record.target().color(colored::Color::Cyan),
                message
            ))
        })
        .level(level)
        .filter(move |metadata| {
            !metadata.target().starts_with("sqlx") || level == log::Level::Trace
        })
        .chain(std::io::stdout())
        .apply()?;
    Ok(())
}

pub fn setup_logger<T: Into<Output>>(level: LevelFilter, logger: T) -> Result<(), fern::InitError> {
    fern::Dispatch::new()
        .format(|out, message, record| {
            out.finish(format_args!(
                "[{} {} {}] {}",
                chrono::Local::now()
                    .format("%Y-%m-%d %H:%M:%S%.3f")
                    .to_string()
                    .as_str()
                    .magenta(),
                record.level().as_str().color(get_color(record.level())),
                record.target().color(colored::Color::Cyan),
                message
            ))
        })
        .level(level)
        .chain(std::io::stdout())
        .chain(logger.into())
        .apply()?;
    Ok(())
}
