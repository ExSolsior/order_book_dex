use crate::{errors::ErrorCode, state::MarketPointer};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct ReturnExecutionMarketOrder<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    /// CHECK: only need pubkey to check if market market has valid config
    pub order_book_config: UncheckedAccount<'info>,

    #[account(
        mut,
        constraint = market_pointer.is_valid_order_book_config(order_book_config.key())
            @ ErrorCode::InvalidMarketPointer,
        constraint = market_pointer.is_valid_return(signer.key())
            @ ErrorCode::InvalidProcessReturnExecutionStatus,
    )]
    pub market_pointer: Account<'info, MarketPointer>,
}

impl<'info> ReturnExecutionMarketOrder<'info> {
    pub fn exec(&mut self) -> Result<()> {
        self.market_pointer.remove_market_order()
    }
}
