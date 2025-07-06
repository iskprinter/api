use std::{
    fmt::{self},
    num::ParseIntError,
};

#[derive(Debug)]
pub enum ConfigError {
    EnvVarError(String),
    // FileReadError(io::Error),
    IntParseError(std::num::ParseIntError),
}

impl From<ParseIntError> for ConfigError {
    fn from(err: ParseIntError) -> ConfigError {
        ConfigError::IntParseError(err)
    }
}

impl fmt::Display for ConfigError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ConfigError::EnvVarError(var_name) => {
                write!(f, "The environment variable {} was not present.", *var_name)
            }
            // ConfigError::FileReadError(e) => write!(f, "File read error: {}", e),
            ConfigError::IntParseError(e) => write!(f, "Integer parsing error: {}", e),
        }
    }
}
