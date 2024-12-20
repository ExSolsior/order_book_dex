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

    #[msg("Invalid Market Order Owner")]
    InvalidMarketOrderOwner,

    #[msg("Invalid Fill Of Market Order")]
    InvalidFillOfMarketOrder,

    #[msg("Invalid Available Status")]
    InvalidAvailableStatus,

    #[msg("Invalid Order Position Add")]
    InvalidOrderPositionAdd,

    #[msg("Invalid Order Position Remove")]
    InvalidOrderPositionRemove,

    #[msg("Invalid Symbol Length")]
    InvalidSymbolLength,

    #[msg("Invalid Order Position Config")]
    InvalidOrderPositionConfig,

    #[msg("Invalid Market Order")]
    InvalidMarketOrder,

    #[msg("Invalid Market Write With Contra")]
    InvalidMarketPointerWrite,

    #[msg("Invalid FIll Order Position")]
    InvalidFillOrderPosition,

    #[msg("Invalid Next Pointer")]
    InvalidNextPointer,

    #[msg("Price * Size / 10 ** DecimalSize = 0, Invalid Bid")]
    TransferOfBidIsZero,

    #[msg("Invalid Maret Order")]
    InvalidTransferAmount,
}
