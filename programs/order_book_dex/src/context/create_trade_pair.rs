use crate::constants::{ASK_SEED, BID_SEED, MARKET_POINTER_SEED, ORDER_BOOK_CONFIG_SEED};
use crate::errors::ErrorCode;
use crate::state::{MarketPointer, Order, OrderBookConfig};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::Mint;

#[derive(Accounts)]
pub struct CreateTradePair<'info> {
    #[account(
        mut,
        // constraint = authority.key == AUTH_ID,
    )]
    pub authority: Signer<'info>,

    #[account(
        constraint = OrderBookConfig::is_valid_mints(
            &token_mint_a.to_account_info(),
            &token_mint_b.to_account_info(),
            &token_program_a.to_account_info(),
            &token_program_b.to_account_info(),
        ) @ ErrorCode::InvalidMints,
        init,
        payer = authority,
        space = OrderBookConfig::LEN,
        seeds = [
            token_mint_a.key().as_ref(),
            token_mint_b.key().as_ref(),
            ORDER_BOOK_CONFIG_SEED.as_bytes(),
        ],
        bump
    )]
    pub order_book_config: Account<'info, OrderBookConfig>,

    #[account(
        init,
        payer = authority,
        space = MarketPointer::LEN,
        seeds = [
            BID_SEED.as_bytes(),
            order_book_config.key().as_ref(),
            MARKET_POINTER_SEED.as_bytes(),
        ],
        bump
    )]
    pub bid_market_pointer: Account<'info, MarketPointer>,

    #[account(
        init,
        payer = authority,
        space = MarketPointer::LEN,
        seeds = [
            ASK_SEED.as_bytes(),
            order_book_config.key().as_ref(),
            MARKET_POINTER_SEED.as_bytes(),
        ],
        bump
    )]
    pub ask_market_pointer: Account<'info, MarketPointer>,

    pub token_mint_a: InterfaceAccount<'info, Mint>,
    pub token_mint_b: InterfaceAccount<'info, Mint>,

    /// CHECK: only need the pubkey to sync with token_mint_a
    pub token_program_a: UncheckedAccount<'info>,

    /// CHECK: only need the pubkey to sync with token_mint_b
    pub token_program_b: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> CreateTradePair<'info> {
    pub fn initialize(&mut self, is_reverse: bool) -> Result<()> {
        self.order_book_config.init(
            self.token_program_a.key(),
            self.token_program_b.key(),
            self.token_mint_a.key(),
            self.token_mint_b.key(),
            is_reverse,
        );

        self.bid_market_pointer
            .init(Order::Buy, self.order_book_config.key())?;
        self.ask_market_pointer
            .init(Order::Sell, self.order_book_config.key())?;

        msg!("New Trade Pair Created: {}", self.order_book_config.key());

        Ok(())
    }
}
