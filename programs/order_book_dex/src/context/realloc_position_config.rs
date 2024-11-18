use crate::state::{OrderBookConfig, OrderPositionConfig};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct Realloc<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    pub order_book_config: Box<Account<'info, OrderBookConfig>>,

    #[account(
        mut,
        realloc = OrderPositionConfig::LEN,
        realloc::payer = signer,
        realloc::zero = false,
    )]
    pub order_position_config: Box<Account<'info, OrderPositionConfig>>,

    pub system_program: Program<'info, System>,
}
