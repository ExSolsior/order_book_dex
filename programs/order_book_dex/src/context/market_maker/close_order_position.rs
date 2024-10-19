use crate::{
    errors::ErrorCode,
    events::CloseLimitOrderEvent,
    state::{OrderBookConfig, OrderPosition, OrderPositionConfig},
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct CloseOrderPosition<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(mut)]
    /// CHECK: validate owner of order position, so the owner receives the lamports
    pub owner: UncheckedAccount<'info>,

    /// CHECK: This account is not mutated. It's only used for constraint validation.
    pub order_book_config: Account<'info, OrderBookConfig>,

    #[account(
        mut,
        constraint = order_position.is_valid_order_book_config(order_book_config.key())
            @ ErrorCode::InvalidOrderPosition,
        constraint = !order_position.is_available
            @ ErrorCode::InvalidAvailableStatus,
        constraint = order_position.order_position_config == order_position_config.key()
            @ ErrorCode::InvalidOrderPosition,
        close = owner
    )]
    pub order_position: Account<'info, OrderPosition>,

    #[account(
        mut,
        constraint = order_position_config.is_valid_order_book_config(order_book_config.key())
            @ ErrorCode::InvalidOrderPositionConfig,
        constraint = order_position_config.is_valid_owner(owner.key())
            @ ErrorCode::InvalidOrderPositionOwner,
    )]
    pub order_position_config: Account<'info, OrderPositionConfig>,

    pub system_program: Program<'info, System>,
}

impl<'info> CloseOrderPosition<'info> {
    pub fn exec(&mut self) -> Result<()> {
        // The account will be automatically closed and its lamports
        // will be transferred to the signer due to the `close = signer` constraint

        emit!(CloseLimitOrderEvent {
            pos_pubkey: self.order_position.key(),
            book_config: self.order_book_config.key(),
            pos_config: self.order_position_config.key(),
        });

        Ok(())
    }
}
