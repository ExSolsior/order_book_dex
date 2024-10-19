use crate::{errors::ErrorCode, events::MarketOrderCompleteEvent, state::MarketPointer};
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
        let market_data = self.market_pointer.remove_market_order()?;

        let Clock {
            slot,
            unix_timestamp,
            ..
        } = Clock::get()?;

        emit!(MarketOrderCompleteEvent {
            market_pointer: self.market_pointer.key(),
            book_config: self.order_book_config.key(),
            new_pointer: self.market_pointer.order_position_pointer,
            order_type: self.market_pointer.order_type.clone(),
            total_cost: market_data.total_cost,
            total_amount: market_data.total_amount,
            last_price: market_data.last_price,
            is_available: self.market_pointer.market_order.is_none(),
            slot: slot,
            timestamp: unix_timestamp,
        });

        Ok(())
    }
}
