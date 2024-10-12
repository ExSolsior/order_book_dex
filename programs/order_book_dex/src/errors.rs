use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid Mints")]
    InvalidMints,

    #[msg("Invalid Mint")]
    InvalidMint,

    #[msg("Invalid Token Program")]
    InvalidTokenProgram,

    #[msg("Invalid Order Type")]
    InvalidOrderType,
}
