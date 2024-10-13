use crate::state::{OrderBookConfig, OrderPosition, OrderPositionConfig};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct CloseOrderPosition<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    /// CHECK: This account is not mutated. It's only used for constraint validation.
    pub order_book_config: Account<'info, OrderBookConfig>,

    #[account(
        mut,
        constraint = order_position.is_valid_order_book_config(order_book_config.key()),
        constraint = order_position.is_avialable,
        constraint = order_position.order_position_config == order_position_config.key(),
        close = signer
    )]
    pub order_position: Account<'info, OrderPosition>,

    #[account(
        mut,
        constraint = order_position_config.is_valid_order_book_config(order_book_config.key()),
        constraint = order_position_config.is_valid_owner(signer.key()),
    )]
    pub order_position_config: Account<'info, OrderPositionConfig>,

    pub system_program: Program<'info, System>,
}

impl<'info> CloseOrderPosition<'info> {
    pub fn exec(&mut self) -> Result<()> {
        // The account will be automatically closed and its lamports 
        // will be transferred to the signer due to the `close = signer` constraint
        Ok(())
    }
}

