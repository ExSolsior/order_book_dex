use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid Order Book Config")]
    InvalidOrderBookConfig,

    #[msg("Invalid Order Position Owner")]
    InvalidOrderPositionOwner,

    #[msg("Invalid Mint")]
    InvalidMint,

    #[msg("Invalid Token Account Source")]
    InvalidSource,

    #[msg("Invalid Token Account Destination")]
    InvalidDestination,

    #[msg("Invalid Token Program")]
    InvalidTokenProgram,

    #[msg("Invalid Order Type")]
    InvalidOrderType,

    #[msg("Invalid Ledger Section")]
    InvalidLedgerSection,

    #[msg("Invalid Order Position")]
    InvalidOrderPosition,

    #[msg("Invalid Market Pointer")]
    InvalidMarketPointer,

    #[msg("Order Position Is Not Available")]
    OrderPositionIsNotAvailable,

    #[msg("Invalid Process Return Execution Status")]
    InvalidProcessReturnExecutionStatus,

    #[msg("Market Order Already In Progress")]
    MarketOrderAlreadyInProgress,

    #[msg("Invalid Taker Destination")]
    InvalidTakerDestination,

    #[msg("Invalid Maker Source")]
    InvalidMakerSource,

    #[msg("Invalid Maker Destination")]
    InvalidMakerDestination,

    #[msg("Invalid Taker Source")]
    InvalidTakerSource,

    #[msg("Invalid Vault Account")]
    InvalidVaultAccount,

    #[msg("Market Order Not In Progress")]
    MarketOrderNotInProgress,

    #[msg("InvalidMarketOrderOwner")]
    InvalidMarketOrderOwner,

    #[msg("InvalidFillOfMarketOrder")]
    InvalidFillOfMarketOrder,
}
