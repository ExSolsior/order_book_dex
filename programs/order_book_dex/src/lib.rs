use anchor_lang::prelude::*;
use context::*;

mod constants;
mod context;
mod errors;
mod state;

declare_id!("Ho5fe2xYQX84C5kXTSB34hZCudUB4Z1KDhFViPFtGoP");

#[program]
pub mod order_book_dex {

    use super::*;

    pub fn create_trade_pair(ctx: Context<CreateTradePair>, is_reverse: bool) -> Result<()> {
        ctx.accounts.initialize(is_reverse)
    }

    pub fn create_order_position_config(ctx: Context<CreateOrderPositionConfig>) -> Result<()> {
        ctx.accounts.init()
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

    pub fn open_order_position_reentrance(ctx: Context<OpenOrderPositionReentrance>) -> Result<()> {
        ctx.accounts.exec()
    }
}
