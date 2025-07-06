use std::process;
use std::sync::Arc;
use tokio::{self, signal};

use tracing::{error, info};
use tracing_subscriber::{filter::LevelFilter, fmt, prelude::*};

mod config;
use config::Config;

mod database;
use database::Database;

mod server;
use server::{Server, ServerConfig};

// Setup tracing with JSON output
fn init_tracing() {
    tracing_subscriber::registry()
        .with(
            fmt::layer()
                .json()
                .with_current_span(true)
                .with_file(true) // Include file name
                .with_level(true) // Include the log level
                .with_line_number(true), // Include line number
        )
        .with(LevelFilter::INFO) // Set the minimum log level
        .init();
}

#[tokio::main]
async fn main() {
    init_tracing();

    // Load configuration
    let config = match Config::load() {
        Ok(config) => config,
        Err(e) => {
            error!("Failed to load configuration: {}", e);
            process::exit(1);
        }
    };

    // Connect to the database
    let database_contact_point = format!(
        "{database_hostname}:{database_port}",
        database_hostname = config.database_hostname,
        database_port = config.database_port,
    );
    let database = Database::connect(&database_contact_point)
        .await
        .unwrap_or_else(|e| {
            error!("Failed to connect to the database: {}", e);
            process::exit(1);
        });
    info!("Successfully connected to the database.");
    database.init().await.unwrap_or_else(|e| {
        error!("Failed to initialize the database: {}", e);
        process::exit(1);
    });
    info!("Successfully initialized the database.");

    let database = Arc::new(database);
    let mut web_server = Server::new(&ServerConfig {
        port: config.server_port,
        database: Arc::clone(&database),
    });
    web_server.start().await.unwrap_or_else(|e| {
        error!("Failed to start the server: {}", e);
        process::exit(1);
    });
    info!("Server started on port {}.", config.server_port);

    // // Wait for SIGTERM signal
    // signal::unix::SignalKind::terminate().into_stream()
    //     .for_each(|_| async {
    //         info!("Received SIGTERM, shutting down gracefully...");
    //     })
    //     .await;
    match signal::ctrl_c().await {
        Ok(()) => {
            info!("Received CTRL+C. Shutting down gracefully...");
        }
        Err(err) => {
            error!("Unable to listen for shutdown signal: {}", err);
            process::exit(1);
        }
    }

    // Gracefully shutdown the server
    if let Err(e) = web_server.stop().await {
        error!("Error during server shutdown: {}", e);
    } else {
        info!("Server shutdown completed");
    }

    // The database will be dropped when it goes out of scope
    info!("Application shutdown complete");
}
