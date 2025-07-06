use super::super::database::Database::{self};

use std::fmt::{self};
use std::sync::Arc;
use tokio::sync::oneshot;
use tokio::task::JoinHandle;
use tokio::time::{timeout, Duration};
use tracing::error;
use warp::Filter;

#[derive(Debug)]
pub struct ServerError {
    message: String,
}

impl ServerError {
    fn new(message: String) -> Self {
        ServerError { message }
    }
}

impl std::error::Error for ServerError {}

impl fmt::Display for ServerError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let message = format!("Server error: {}", self.message);
        error!(message);
        write!(f, "Server error: {}", self.message)
    }
}

pub struct ServerConfig {
    pub port: u16,
    pub database: Arc<Database>,
}

pub struct Server {
    database: Arc<Database>,
    port: u16,
    shutdown_tx: Option<oneshot::Sender<()>>,
    server_handle: Option<JoinHandle<()>>,
}

impl Server {
    pub fn new(config: &ServerConfig) -> Self {
        Server {
            database: Arc::clone(&config.database),
            port: config.port,
            shutdown_tx: None,
            server_handle: None,
        }
    }

    pub async fn start(&mut self) -> Result<(), ServerError> {
        let (shutdown_tx, shutdown_rx) = oneshot::channel();
        
        let routes = warp::path!("readyz")
            .map(|| warp::reply::with_status("OK", warp::http::StatusCode::OK));
        
        let (_addr, server) = warp::serve(routes)
            .bind_with_graceful_shutdown(([0, 0, 0, 0], self.port), async {
                shutdown_rx.await.ok();
            });
            
        let server_handle = tokio::spawn(server);
        
        self.shutdown_tx = Some(shutdown_tx);
        self.server_handle = Some(server_handle);
        Ok(())
    }

    pub async fn stop(&mut self) -> Result<(), ServerError> {
        if let Some(tx) = self.shutdown_tx.take() {
            let _ = tx.send(()); // Signal graceful shutdown
        }
        
        if let Some(handle) = self.server_handle.take() {
            // Wait up to 20 seconds for graceful shutdown
            match timeout(Duration::from_secs(20), handle).await {
                Ok(_) => {
                    // Server shut down gracefully
                    Ok(())
                }
                Err(_) => {
                    // Timeout exceeded, server is forcibly terminated
                    Err(ServerError::new("Server shutdown timed out after 20 seconds".to_string()))
                }
            }
        } else {
            Ok(())
        }
    }
}
