use anchor_lang::prelude::*;
use context::*;

pub mod constants;
mod context;
mod errors;
mod events;
pub mod state;

declare_id!("4z84hS8fsVpBgZvNwPtH82uUrjuoGP5GkRrTKkAaFDc9");

#[program]
pub mod order_book_dex {

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
        )
    }

    pub fn create_vault_accounts(ctx: Context<CreateVaultAccounts>) -> Result<()> {
        ctx.accounts.initialize()
    }

    pub fn create_order_position_config(ctx: Context<CreateOrderPositionConfig>) -> Result<()> {
        ctx.accounts.init(ctx.program_id)
    }

    pub fn create_order_position(
        ctx: Context<CreateOrderPosition>,
        order_type: state::Order,
        price: u64,
        amount: u64,
    ) -> Result<()> {
        ctx.accounts.exec(order_type, price, amount)
    }

    pub fn open_order_position(ctx: Context<OpenOrderPosition>) -> Result<()> {
        ctx.accounts.exec()
    }

    pub fn cancel_order_position(ctx: Context<CancelOrderPosition>) -> Result<()> {
        ctx.accounts.exec()
    }

    pub fn close_order_position(ctx: Context<CloseOrderPosition>) -> Result<()> {
        ctx.accounts.exec()
    }

    pub fn create_market_order(
        ctx: Context<CreateMarketOrder>,
        order_type: state::Order,
        fill: state::Fill,
        target_amount: u64,
    ) -> Result<()> {
        ctx.accounts.exec(order_type, fill, target_amount)
    }

    pub fn fill_market_order(ctx: Context<FillMarketOrder>) -> Result<()> {
        ctx.accounts.exec()
    }

    pub fn return_execution_market_order(ctx: Context<ReturnExecutionMarketOrder>) -> Result<()> {
        ctx.accounts.exec()
    }
}
