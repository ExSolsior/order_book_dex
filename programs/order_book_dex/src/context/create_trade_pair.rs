use crate::constants::{BUY_SEED, MARKET_POINTER_SEED, ORDER_BOOK_CONFIG_SEED, SELL_SEED};
use crate::errors::ErrorCode;
use crate::events::NewOrderBookConfigEvent;
use crate::state::{MarketPointer, Order, OrderBookConfig};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::Mint;

#[derive(Accounts)]
#[instruction(token_symbol_a: String, token_symbol_b: String)]
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
        ) @ ErrorCode::InvalidMint,
        constraint = OrderBookConfig::is_valid_symbol(token_symbol_a) 
            && OrderBookConfig::is_valid_symbol(token_symbol_b)
            @ ErrorCode::InvalidSymbolLength,
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
            BUY_SEED.as_bytes(),
            order_book_config.key().as_ref(),
            MARKET_POINTER_SEED.as_bytes(),
        ],
        bump
    )]
    pub buy_market_pointer: Account<'info, MarketPointer>,

    #[account(
        init,
        payer = authority,
        space = MarketPointer::LEN,
        seeds = [
            SELL_SEED.as_bytes(),
            order_book_config.key().as_ref(),
            MARKET_POINTER_SEED.as_bytes(),
        ],
        bump
    )]
    pub sell_market_pointer: Account<'info, MarketPointer>,

    pub token_mint_a: InterfaceAccount<'info, Mint>,
    pub token_mint_b: InterfaceAccount<'info, Mint>,

    /// CHECK: only need the pubkey to sync with token_mint_a
    pub token_program_a: UncheckedAccount<'info>,

    /// CHECK: only need the pubkey to sync with token_mint_b
    pub token_program_b: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> CreateTradePair<'info> {
    pub fn initialize(
        &mut self,
        token_symbol_a: String,
        token_symbol_b: String,
        is_reverse: bool,
        bump: u8,
    ) -> Result<()> {
        self.order_book_config.init(
            self.token_program_a.key(),
            self.token_program_b.key(),
            self.token_mint_a.key(),
            self.token_mint_b.key(),
            token_symbol_a,
            token_symbol_b,
            is_reverse,
            bump,
        );

        self.buy_market_pointer
            .init(Order::Buy, self.order_book_config.key())?;
        self.sell_market_pointer
            .init(Order::Sell, self.order_book_config.key())?;

        let Clock {
            slot,
            unix_timestamp,
            ..
        } = Clock::get()?;

        emit!(NewOrderBookConfigEvent {
            book_config: self.order_book_config.key(),
            token_mint_a: self.token_mint_a.key(),
            token_mint_b: self.token_mint_b.key(),
            token_program_a: self.token_program_a.key(),
            token_program_b: self.token_program_b.key(),
            sell_market_pointer: self.sell_market_pointer.key(),
            buy_market_pointer: self.buy_market_pointer.key(),
            token_symbol_a: self.order_book_config.token_symbol_a.clone(),
            token_symbol_b: self.order_book_config.token_symbol_b.clone(),
            is_reverse: self.order_book_config.is_reverse,
            slot: slot,
            timestamp: unix_timestamp,
        });

        Ok(())
    }
}
