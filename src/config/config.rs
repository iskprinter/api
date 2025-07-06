use std::env::{self};

use super::ConfigError;

pub struct Config {
    pub database_hostname: String,
    pub database_port: u16,
    pub server_port: u16,
}

impl Config {
    pub fn load() -> Result<Self, ConfigError> {
        // let postgres_database_name = get_env_var("ISKPRINTER_POSTGRES_DATABASE_NAME")?;

        let database_hostname = get_env_var("ISKPRINTER_DATABASE_HOSTNAME")?;

        let database_port = get_env_var("ISKPRINTER_DATABASE_PORT")?.parse::<u16>()?;

        let server_port = get_env_var("ISKPRINTER_SERVER_PORT")
            .unwrap_or("8080".to_string())
            .parse::<u16>()?;

        // let postgres_username = get_env_var("ISKPRINTER_POSTGRES_USERNAME_PATH")
        //     .and_then(|path| fs::read_to_string(&path).map_err(ConfigError::FileReadError))
        //     .map(|content| content.trim_end().to_string())?;

        // let postgres_password = get_env_var("ISKPRINTER_POSTGRES_PASSWORD_PATH")
        //     .and_then(|path| fs::read_to_string(&path).map_err(ConfigError::FileReadError))
        //     .map(|content| content.trim_end().to_string())?;

        Ok(Config {
            database_hostname,
            database_port,
            server_port,
        })
    }
}

fn get_env_var(var_name: &str) -> Result<String, ConfigError> {
    env::var(var_name).map_err(|_| ConfigError::EnvVarError(var_name.to_string()))
}
