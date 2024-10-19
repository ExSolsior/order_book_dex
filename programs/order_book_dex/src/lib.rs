use anchor_lang::prelude::*;
use context::*;

mod constants;
mod context;
mod errors;
mod events;
mod state;

declare_id!("4z84hS8fsVpBgZvNwPtH82uUrjuoGP5GkRrTKkAaFDc9");

#[program]
pub mod order_book_dex {

    use events::{
        CancelLimitOrderEvent, CloseLimitOrderEvent, CreateOrderPositionEvent,
        MarketOrderCompleteEvent, MarketOrderFillEvent, MarketOrderTriggerEvent,
        NewOrderBookConfigEvent, NewOrderPositionConfigEvent, OpenLimitOrderEvent,
    };

    use super::*;

    pub fn create_trade_pair(
        ctx: Context<CreateTradePair>,
        token_symbol_a: String,
        token_symbol_b: String,
        is_reverse: bool,
    ) -> Result<()> {
        ctx.accounts.initialize(
            token_symbol_a,
            token_symbol_b,
            is_reverse,
            ctx.bumps.order_book_config,
        )?;

        let Clock {
            slot,
            unix_timestamp,
            ..
        } = Clock::get()?;

        emit_cpi!(NewOrderBookConfigEvent {
            book_config: ctx.accounts.order_book_config.key(),
            token_mint_a: ctx.accounts.token_mint_a.key(),
            token_mint_b: ctx.accounts.token_mint_b.key(),
            token_program_a: ctx.accounts.token_program_a.key(),
            token_program_b: ctx.accounts.token_program_b.key(),
            sell_market_pointer: ctx.accounts.sell_market_pointer.key(),
            buy_market_pointer: ctx.accounts.buy_market_pointer.key(),
            token_symbol_a: ctx.accounts.order_book_config.token_symbol_a.clone(),
            token_symbol_b: ctx.accounts.order_book_config.token_symbol_b.clone(),
            token_decimals_a: ctx.accounts.token_mint_a.decimals,
            token_decimals_b: ctx.accounts.token_mint_b.decimals,
            is_reverse: ctx.accounts.order_book_config.is_reverse,
            slot: slot,
            timestamp: unix_timestamp,
        });

        Ok(())
    }

    pub fn create_vault_accounts(ctx: Context<CreateVaultAccounts>) -> Result<()> {
        ctx.accounts.initialize()
    }

    pub fn create_order_position_config(ctx: Context<CreateOrderPositionConfig>) -> Result<()> {
        ctx.accounts.init()?;

        let Clock {
            slot,
            unix_timestamp,
            ..
        } = Clock::get()?;

        emit_cpi!(NewOrderPositionConfigEvent {
            book_config: ctx.accounts.order_book_config.key(),
            pos_config: ctx.accounts.order_position_config.key(),
            slot: slot,
            timestamp: unix_timestamp,
        });

        Ok(())
    }

    pub fn create_order_position(
        ctx: Context<CreateOrderPosition>,
        order_type: state::Order,
        price: u64,
        amount: u64,
    ) -> Result<()> {
        ctx.accounts.exec(order_type, price, amount)?;

        emit_cpi!(CreateOrderPositionEvent {
            pos_pubkey: ctx.accounts.order_position.key(),
            book_config: ctx.accounts.order_book_config.key(),
            pos_config: ctx.accounts.order_position_config.key(),
            order_type: ctx.accounts.order_position.order_type.clone(),
        });

        Ok(())
    }

    pub fn open_order_position(ctx: Context<OpenOrderPosition>) -> Result<()> {
        ctx.accounts.exec()?;

        let Clock {
            slot,
            unix_timestamp,
            ..
        } = Clock::get()?;

        emit_cpi!(OpenLimitOrderEvent {
            pos_pubkey: ctx.accounts.order_position.key(),
            book_config: ctx.accounts.order_book_config.key(),
            pos_config: ctx.accounts.order_position_config.key(),
            source: ctx.accounts.order_position.source.key(),
            destination: ctx.accounts.order_position.destination.key(),
            next_pos_pubkey: ctx.accounts.order_position.next_order_position,
            order_type: ctx.accounts.order_position.order_type.clone(),
            price: ctx.accounts.order_position.price,
            size: ctx.accounts.order_position.amount,
            slot: slot,
            timestamp: unix_timestamp,
            is_available: true,
        });

        Ok(())
    }

    pub fn cancel_order_position(ctx: Context<CancelOrderPosition>) -> Result<()> {
        ctx.accounts.exec()?;
        let amount = ctx.accounts.refund()?;

        emit_cpi!(CancelLimitOrderEvent {
            pos_pubkey: ctx.accounts.order_position.key(),
            book_config: ctx.accounts.order_book_config.key(),
            pos_config: ctx.accounts.order_position_config.key(),
            amount: amount,
            is_available: ctx.accounts.order_position.is_available,
        });

        Ok(())
    }

    pub fn close_order_position(ctx: Context<CloseOrderPosition>) -> Result<()> {
        ctx.accounts.exec()?;

        emit_cpi!(CloseLimitOrderEvent {
            pos_pubkey: ctx.accounts.order_position.key(),
            book_config: ctx.accounts.order_book_config.key(),
            pos_config: ctx.accounts.order_position_config.key(),
        });

        Ok(())
    }

    pub fn create_market_order(
        ctx: Context<CreateMarketOrder>,
        order_type: state::Order,
        fill: state::Fill,
        target_amount: u64,
    ) -> Result<()> {
        ctx.accounts.exec(order_type, fill, target_amount)?;

        let Clock {
            slot,
            unix_timestamp,
            ..
        } = Clock::get()?;

        emit_cpi!(MarketOrderTriggerEvent {
            market_pointer: ctx.accounts.market_pointer.key(),
            book_config: ctx.accounts.order_book_config.key(),
            pointer: ctx.accounts.market_pointer.order_position_pointer,
            order_type: ctx.accounts.market_pointer.order_type.clone(),
            is_available: ctx.accounts.market_pointer.market_order.is_none(),
            slot: slot,
            timestamp: unix_timestamp,
        });

        Ok(())
    }

    pub fn fill_market_order(ctx: Context<FillMarketOrder>) -> Result<()> {
        let (amount, total) = ctx.accounts.exec()?;

        let Clock {
            slot,
            unix_timestamp,
            ..
        } = Clock::get()?;

        emit_cpi!(MarketOrderFillEvent {
            market_pointer: ctx.accounts.market_pointer.key(),
            book_config: ctx.accounts.order_book_config.key(),
            pos_pubkey: ctx.accounts.order_position.key(),
            order_type: ctx.accounts.market_pointer.order_type.clone(),
            price: ctx.accounts.order_position.price,
            total: total,
            amount: amount,
            new_size: ctx.accounts.order_position.amount,
            slot: slot,
            timestamp: unix_timestamp,
            is_available: ctx.accounts.order_position.is_available,
        });

        Ok(())
    }

    pub fn return_execution_market_order(ctx: Context<ReturnExecutionMarketOrder>) -> Result<()> {
        let market_data = ctx.accounts.exec()?;

        let Clock {
            slot,
            unix_timestamp,
            ..
        } = Clock::get()?;

        emit_cpi!(MarketOrderCompleteEvent {
            market_pointer: ctx.accounts.market_pointer.key(),
            book_config: ctx.accounts.order_book_config.key(),
            new_pointer: ctx.accounts.market_pointer.order_position_pointer,
            order_type: ctx.accounts.market_pointer.order_type.clone(),
            total_cost: market_data.total_cost,
            total_amount: market_data.total_amount,
            last_price: market_data.last_price,
            is_available: ctx.accounts.market_pointer.market_order.is_none(),
            slot: slot,
            timestamp: unix_timestamp,
        });

        Ok(())
    }
}
