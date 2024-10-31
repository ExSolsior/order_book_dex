use solana_client::client_error::ClientError;
use solana_sdk::message::CompileError;

#[derive(thiserror::Error, Debug)]
pub enum TransactionBuildError {
    #[error("RPC client error: {0}")]
    RpcClient(#[from] ClientError),

    #[error(transparent)]
    DatabaseError(#[from] sqlx::Error),

    #[error("Failed to compile versioned message: {0}")]
    VersionedMessage(#[from] CompileError),

    #[error("Invalid Order Position Or Signer")]
    InvalidOrderPositionOrSigner,

    #[error("Empty Order Book")]
    EmptyOrderBook,
}
