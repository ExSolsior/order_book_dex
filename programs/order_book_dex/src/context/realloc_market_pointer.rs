use crate::constants::{BUY_SEED, MARKET_POINTER_SEED, SELL_SEED};
use crate::state::{MarketPointer, OrderBookConfig};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct Realloc<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    pub order_book_config: Box<Account<'info, OrderBookConfig>>,

    #[account(
        mut,
        seeds = [
            BUY_SEED.as_bytes(),
            order_book_config.key().as_ref(),
            MARKET_POINTER_SEED.as_bytes(),
        ],
        bump,
        realloc = MarketPointer::LEN,
        realloc::payer = signer,
        realloc::zero = false,
    )]
    pub buy_market_pointer: Box<Account<'info, MarketPointer>>,

    #[account(
        mut,
        seeds = [
            SELL_SEED.as_bytes(),
            order_book_config.key().as_ref(),
            MARKET_POINTER_SEED.as_bytes(),
        ],
        bump,
        realloc = MarketPointer::LEN,
        realloc::payer = signer,
        realloc::zero = false,
    )]
    pub sell_market_pointer: Account<'info, MarketPointer>,

    pub system_program: Program<'info, System>,
}
