// use crate::errors::ErrorCode;
use crate::state::{MarketPointer, OrderBookConfig, OrderPosition};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct OpenOrderPosition<'info> {
    #[account(mut)]
    pub singer: Signer<'info>,

    #[account(
        constraint = market_pointer.is_valid_config(order_book_config.key()),
        constraint = order_position.is_valid_order_book_config(order_book_config.key()),

    )]
    pub order_book_config: Account<'info, OrderBookConfig>,

    #[account(
        mut,
        constraint = market_pointer.is_valid_execution(),
        constraint = market_pointer.is_valid_position(prev_order_position.as_ref(), next_order_position.as_ref()),
        constraint = market_pointer.is_valid_order_type_match(prev_order_position.as_ref()),
        constraint = market_pointer.is_valid_order_type_match(next_order_position.as_ref()),
        constraint = OrderBookConfig::is_valid_config_with_order_position(order_book_config.key(), prev_order_position.as_ref()),
        constraint = OrderBookConfig::is_valid_config_with_order_position(order_book_config.key(), next_order_position.as_ref()),
    )]
    pub market_pointer: Account<'info, MarketPointer>,

    #[account(
        mut,
        constraint = order_position.is_valid_order_type_match(&market_pointer),
        constraint = order_position.is_avialable,
    )]
    pub order_position: Account<'info, OrderPosition>,

    #[account(mut)]
    pub prev_order_position: Option<Account<'info, OrderPosition>>,

    #[account(mut)]
    pub next_order_position: Option<Account<'info, OrderPosition>>,
}

impl<'info> OpenOrderPosition<'info> {
    pub fn exec(&mut self) -> Result<()> {
        // assert!(self
        //     .market_pointer
        //     .is_valid_order_type_match(self.prev_order_position.as_ref()));
        // assert!(OrderBookConfig::is_valid_config_with_order_position(
        //     self.order_book_config.key(),
        //     self.prev_order_position.clone()
        // ));

        // assert!(self
        //     .market_pointer
        //     .is_valid_order_type_match(self.next_order_position.as_ref()));
        // assert!(OrderBookConfig::is_valid_config_with_order_position(
        //     self.order_book_config.key(),
        //     self.next_order_position.clone()
        // ));

        if let Some(prev_order_position) = self.prev_order_position.as_mut() {
            prev_order_position.next_order_position = Some(self.order_position.key());
        } else {
            self.market_pointer.order_position_pointer = Some(self.order_position.key());
        };

        if let Some(next_order_position) = self.next_order_position.as_mut() {
            self.order_position.next_order_position = Some(next_order_position.key());
        } else {
            self.order_position.next_order_position = None;
        };

        Ok(())
    }
}
