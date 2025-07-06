use cdrs_tokio::cluster::session::{Session, SessionBuilder, TcpSessionBuilder};
use cdrs_tokio::cluster::{NodeTcpConfigBuilder, TcpConnectionManager};
use cdrs_tokio::load_balancing::RoundRobinLoadBalancingStrategy;
use cdrs_tokio::transport::TransportTcp;
use tracing::error;

use std::fmt::{self};

#[derive(Debug)]
pub struct DatabaseError {
    message: String,
}

impl DatabaseError {
    fn new(message: String) -> Self {
        DatabaseError { message }
    }
}

impl std::error::Error for DatabaseError {}

impl fmt::Display for DatabaseError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let message = format!("Database error: {}", self.message);
        error!(message);
        write!(f, "Database error: {}", self.message)
    }
}

pub struct Database {
    session: Session<
        TransportTcp,
        TcpConnectionManager,
        RoundRobinLoadBalancingStrategy<TransportTcp, TcpConnectionManager>,
    >,
}

impl Database {
    pub async fn connect(contact_point: &str) -> Result<Self, DatabaseError> {
        let cluster_config = NodeTcpConfigBuilder::new()
            .with_contact_point(contact_point.into())
            .build()
            .await
            .map_err(|e| DatabaseError::new(format!("Failed to build cluster config: {}", e)))?;
        let session =
            TcpSessionBuilder::new(RoundRobinLoadBalancingStrategy::new(), cluster_config)
                .build()
                .await
                .map_err(|e| {
                    DatabaseError::new(format!("Failed to open database connection session: {}", e))
                })?;
        Ok(Database { session })
    }

    pub async fn init(&self) -> Result<(), DatabaseError> {
        let create_keyspace = "CREATE KEYSPACE IF NOT EXISTS iskprinter WITH REPLICATION = {'class': 'SimpleStrategy', 'replication_factor': 1}";
        self.session.query(create_keyspace).await.map_err(|e| {
            DatabaseError::new(format!("Failed to create the Cassandra keyspace: {}", e))
        })?;

        let create_tables = "
            CREATE TABLE IF NOT EXISTS iskprinter.users (
                id         UUID PRIMARY KEY, 
                username   TEXT, 
                email      TEXT, 
                created_at TIMESTAMP,
                updated_at TIMESTAMP
            );
        ";
        self.session.query(create_tables).await.map_err(|e| {
            DatabaseError::new(format!("Failed to create the 'users' table: {}", e))
        })?;

        Ok(())
    }
}
