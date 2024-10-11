// use crate::errors::ErrorCode;
use crate::state::{MarketPointer, OrderBookConfig, OrderPosition};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct OpenOrderPosition<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        constraint = MarketPointer::validate_mutable_status(market_pointer_read.as_ref(), market_pointer_write.as_ref()),
    )]
    pub order_book_config: Account<'info, OrderBookConfig>,

    #[account(
        constraint = market_pointer_read.is_valid_order_book_config(order_book_config.key()),
        constraint = market_pointer_read.is_valid_order_type_match(prev_order_position.as_ref()),
        constraint = market_pointer_read.is_valid_order_type_match(next_order_position.as_ref()),
        constraint = market_pointer_read.is_valid_position(prev_order_position.as_ref(), next_order_position.as_ref()),
        constraint = market_pointer_read.is_valid_prev_order_position(prev_order_position.as_ref()),
        constraint = market_pointer_read.is_valid_open_position_section(&order_position, next_position_pointer.as_ref()),
        constraint = order_position.is_valid_order_type_match(&market_pointer_read),
    )]
    pub market_pointer_read: Option<Account<'info, MarketPointer>>,

    #[account(
        mut,
        constraint = market_pointer_write.is_valid_order_book_config(order_book_config.key()),
        constraint = market_pointer_write.is_valid_order_type_match(prev_order_position.as_ref()),
        constraint = market_pointer_write.is_valid_order_type_match(next_order_position.as_ref()),
        constraint = market_pointer_write.is_valid_position(prev_order_position.as_ref(), next_order_position.as_ref()),
        constraint = market_pointer_write.is_valid_prev_order_position(prev_order_position.as_ref()),
        constraint = market_pointer_write.is_valid_open_position_section(&order_position, next_position_pointer.as_ref()),
        constraint = order_position.is_valid_order_type_match(&market_pointer_write),
    )]
    pub market_pointer_write: Option<Account<'info, MarketPointer>>,

    #[account(
        mut,
        constraint = order_position.is_valid_order_book_config(order_book_config.key()),
        constraint = order_position.is_avialable,
    )]
    pub order_position: Account<'info, OrderPosition>,

    #[account(
        mut,
        constraint = prev_order_position.is_valid_order_book_config(order_book_config.key()),
    )]
    pub prev_order_position: Option<Account<'info, OrderPosition>>,

    #[account(
        mut,
        constraint = next_order_position.is_valid_order_book_config(order_book_config.key()),

    )]
    pub next_order_position: Option<Account<'info, OrderPosition>>,

    #[account(
        constraint = next_position_pointer.is_valid_order_book_config(order_book_config.key()),
    )]
    pub next_position_pointer: Option<Account<'info, OrderPosition>>,
}

impl<'info> OpenOrderPosition<'info> {
    pub fn exec(&mut self) -> Result<()> {
        if let Some(prev_order_position) = self.prev_order_position.as_mut() {
            prev_order_position.next_order_position = Some(self.order_position.key());
        } else if let Some(market_pointer) = self.market_pointer_write.as_mut() {
            market_pointer.order_position_pointer = Some(self.order_position.key());
        };

        if let Some(next_order_position) = self.next_order_position.as_mut() {
            self.order_position.next_order_position = Some(next_order_position.key());
        } else {
            self.order_position.next_order_position = None;
        };

        Ok(())
    }
}
