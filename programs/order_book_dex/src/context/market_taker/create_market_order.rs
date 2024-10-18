use crate::{
    constants::VAULT_ACCOUNT_SEED,
    errors::ErrorCode,
    events::MarketOrderTriggerEvent,
    state::{Fill, MarketPointer, Order, OrderBookConfig, OrderPosition},
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(order_type: Order)]
pub struct CreateMarketOrder<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    pub order_book_config: Account<'info, OrderBookConfig>,

    #[account(
        mut,
        constraint = market_pointer.is_valid_order_book_config(order_book_config.key())
            @ ErrorCode::InvalidMarketPointer,
        constraint = market_pointer.is_valid_availability()
            @ ErrorCode::MarketOrderAlreadyInProgress,
        constraint = order_type == Order::Buy || order_type == Order::Sell
            @ ErrorCode::InvalidMarketOrder,
    )]
    pub market_pointer: Account<'info, MarketPointer>,

    #[account(
        seeds = [
            order_book_config.key().as_ref(),
            token_mint_source.key().as_ref(),
            signer.key().as_ref(),
            VAULT_ACCOUNT_SEED.as_bytes(),
        ],
        bump
    )]
    /// CHECKED: just need to validate using seeds
    pub source: UncheckedAccount<'info>,

    #[account(
        seeds = [
            order_book_config.key().as_ref(),
            token_mint_dest.key().as_ref(),
            signer.key().as_ref(),
            VAULT_ACCOUNT_SEED.as_bytes(),
        ],
        bump
    )]
    /// CHECKED: just need to validate using seeds
    pub dest: UncheckedAccount<'info>,

    #[account(
        constraint = order_book_config.is_valid_token_mint_source(token_mint_source.key(), &market_pointer)
            @ ErrorCode::InvalidMint,
    )]
    /// CHECKED: validate mint pubkey agaist order book config and market pointer order type
    pub token_mint_source: UncheckedAccount<'info>,

    #[account(
        constraint = order_book_config.is_valid_token_mint_dest(token_mint_dest.key(), &market_pointer)
            @ ErrorCode::InvalidMint,
    )]
    /// CHECKED: validate mint pubkey agaist order book config and market pointer order type
    pub token_mint_dest: UncheckedAccount<'info>,

    #[account(
        constraint = next_position_pointer.is_valid_order_book_config(order_book_config.key())
            @ ErrorCode::InvalidOrderPosition,
        constraint = next_position_pointer.is_valid_order_type_match(&market_pointer)
            @ ErrorCode::InvalidOrderType,
    )]
    pub next_position_pointer: Account<'info, OrderPosition>,
}

impl<'info> CreateMarketOrder<'info> {
    // I don't think I need the order_type since it already exist on the market pointer
    // also the order_type is not being validated so it is a current security concern.
    pub fn exec(&mut self, order_type: Order, fill: Fill, target_amount: u64) -> Result<()> {
        self.market_pointer.add_market_order(
            order_type,
            fill,
            target_amount,
            self.signer.key(),
            self.source.key(),
            self.dest.key(),
            self.next_position_pointer.key(),
        )?;

        let Clock {
            slot,
            unix_timestamp,
            ..
        } = Clock::get()?;

        emit!(MarketOrderTriggerEvent {
            market_pointer: self.market_pointer.key(),
            book_config: self.order_book_config.key(),
            pointer: self.market_pointer.order_position_pointer,
            order_type: self.market_pointer.order_type.clone(),
            is_available: self.market_pointer.market_order.is_none(),
            slot: slot,
            timestamp: unix_timestamp,
        });

        Ok(())
    }
}
