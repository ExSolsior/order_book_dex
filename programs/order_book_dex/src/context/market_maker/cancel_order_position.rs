use crate::{constants::ORDER_BOOK_CONFIG_SEED, errors::ErrorCode, state::{MarketPointer, OrderBookConfig, OrderPosition, OrderPositionConfig}};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{transfer_checked, Mint, TokenAccount, TransferChecked};

#[event_cpi]
#[derive(Accounts)]
pub struct CancelOrderPosition<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        constraint = MarketPointer::validate_mutable_status(market_pointer_read.as_ref(), market_pointer_write.as_ref())
            @ ErrorCode::InvalidMarketPointer,
    )]
    pub order_book_config: Box<Account<'info, OrderBookConfig>>,

    #[account(
        constraint = market_pointer_read.is_valid_order_book_config(order_book_config.key())
            @ ErrorCode::InvalidMarketPointer,
        constraint = market_pointer_read.is_valid_order_type_match(prev_order_position.as_ref())
            @ ErrorCode::InvalidOrderType,
        constraint = market_pointer_read.is_valid_order_type_match(next_order_position.as_ref())
            @ ErrorCode::InvalidOrderType,
        constraint = market_pointer_read.is_valid_position_remove(
            &order_position,
            prev_order_position.as_ref(), 
            next_order_position.as_ref()
        ) @ ErrorCode::InvalidOrderPositionRemove,
    )]
    pub market_pointer_read: Option<Account<'info, MarketPointer>>,

    #[account(
        mut,
        constraint = market_pointer_write.is_valid_order_book_config(order_book_config.key())
            @ ErrorCode::InvalidMarketPointer,
        constraint = market_pointer_write.is_valid_order_type_match(prev_order_position.as_ref())
            @ ErrorCode::InvalidOrderType,
        constraint = market_pointer_write.is_valid_order_type_match(next_order_position.as_ref())
            @ ErrorCode::InvalidOrderType,
        constraint = market_pointer_write.is_valid_position_remove(
            &order_position,
            prev_order_position.as_ref(), 
            next_order_position.as_ref()
        ) @ ErrorCode::InvalidOrderPositionRemove,
    )]
    pub market_pointer_write: Option<Account<'info, MarketPointer>>,

    #[account(
        mut,
        constraint = order_position.is_valid_order_book_config(order_book_config.key())
            @ ErrorCode::InvalidOrderPosition,
        constraint = order_position.is_available
            @ ErrorCode::InvalidAvailableStatus,
        constraint = order_position.order_position_config == order_position_config.key()
            @ ErrorCode::InvalidOrderPosition,
    )]
    pub order_position: Account<'info, OrderPosition>,

    #[account(
        mut,
        constraint = order_position_config.is_valid_order_book_config(order_book_config.key())
            @ ErrorCode::InvalidOrderPositionConfig,
        constraint = order_position_config.is_valid_owner(signer.key())
            @ ErrorCode::InvalidOrderPositionOwner,
    )]
    pub order_position_config: Account<'info, OrderPositionConfig>,

    #[account(
        mut,
        constraint = prev_order_position.is_valid_order_book_config(order_book_config.key())
            @ ErrorCode::InvalidOrderPosition,
    )]
    pub prev_order_position: Option<Account<'info, OrderPosition>>,

    #[account(
        mut,
        constraint = next_order_position.is_valid_order_book_config(order_book_config.key())
            @ ErrorCode::InvalidOrderPosition,
    )]
    pub next_order_position: Option<Account<'info, OrderPosition>>,

    #[account(mut)]
    pub capital_destination: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub source: InterfaceAccount<'info, TokenAccount>,

    #[account(
        constraint = order_book_config.token_mint_a == token_mint.key() 
            || order_book_config.token_mint_b == token_mint.key()
            @ ErrorCode::InvalidMint,
    )]
    pub token_mint: InterfaceAccount<'info, Mint>,

    #[account(
        constraint = order_book_config.token_program_a == token_program.key() 
            || order_book_config.token_program_b == token_program.key()
            @ ErrorCode::InvalidTokenProgram,
    )]
    /// CHECK: apparently this works -> if necessary will set as Program<>
    pub token_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> CancelOrderPosition<'info> {
    pub fn exec(&mut self) -> Result<()> {
        // Update the linked list
        if let Some(prev_order_position) = self.prev_order_position.as_mut() {
            // If there's a previous order, update its next pointer to skip over the current order
            // This effectively removes the current order from the linked list
            prev_order_position.next_order_position = self.order_position.next_order_position;
        } else if let Some(market_pointer) = self.market_pointer_write.as_mut() {
            // If there's no previous order, this means the current order is at the head of the list
            // In this case, update the market pointer to point to the next order (or None if this was the only order)
            market_pointer.order_position_pointer = self.order_position.next_order_position;
        }

        // At this point, the current order has been removed from the linked list:
        // - If it was in the middle, the previous order now points to next order
        // - If it was at the head, the market pointer now points to the next order (or None)
        // - If it was at the tail, the previous order now has its next pointer set to None

        // Mark the order position as unavailable and next order as None
        self.order_position.is_available = false;
        self.order_position.next_order_position = None;

        Ok(())
    }

    pub fn refund(&mut self) -> Result<u64> {
        // Transfer funds back to the user

        let token_mint_a_key = self.order_book_config.token_mint_a;
        let token_mint_b_key = self.order_book_config.token_mint_b;
        let bump = &[self.order_book_config.bump];

        let signer_seeds = &[&[
            token_mint_a_key.as_ref(),
            token_mint_b_key.as_ref(),
            ORDER_BOOK_CONFIG_SEED.as_bytes(),
            bump,
        ][..]];

        let amount = self.order_position.amount;
        self.order_position.amount = 0;
        transfer_checked(
            CpiContext::new_with_signer(
                self.token_program.to_account_info(),
                TransferChecked {
                    from: self.source.to_account_info(),
                    to: self.capital_destination.to_account_info(),
                    authority: self.order_book_config.to_account_info(),
                    mint: self.token_mint.to_account_info(),
                },
                signer_seeds,
            ),
            amount,
            self.token_mint.decimals,
        )?;



        Ok(amount)
    }
}
