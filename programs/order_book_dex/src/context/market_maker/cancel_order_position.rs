use crate::state::{MarketPointer, OrderBookConfig, OrderPosition, OrderPositionConfig};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{transfer_checked, Mint, TokenAccount, TransferChecked};

#[derive(Accounts)]
pub struct CancelOrderPosition<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        constraint = MarketPointer::validate_mutable_status(market_pointer_read.as_ref(), market_pointer_write.as_ref()),
    )]
    pub order_book_config: Account<'info, OrderBookConfig>,

    #[account(
        constraint = market_pointer_read.is_valid_order_book_config(order_book_config.key()),
        constraint = market_pointer_read.is_valid_order_type_match(prev_order_position.as_ref()),
        constraint = market_pointer_read.is_valid_order_type_match(next_order_position.as_ref()),
        constraint = market_pointer_read.is_valid_position(prev_order_position.as_ref(), next_order_position.as_ref()),
    )]
    pub market_pointer_read: Option<Account<'info, MarketPointer>>,

    #[account(
        mut,
        constraint = market_pointer_write.is_valid_order_book_config(order_book_config.key()),
        constraint = market_pointer_write.is_valid_order_type_match(prev_order_position.as_ref()),
        constraint = market_pointer_write.is_valid_order_type_match(next_order_position.as_ref()),
        constraint = market_pointer_write.is_valid_position(prev_order_position.as_ref(), next_order_position.as_ref()),
    )]
    pub market_pointer_write: Option<Account<'info, MarketPointer>>,

    #[account(
        mut,
        constraint = order_position.is_valid_order_book_config(order_book_config.key()),
        constraint = order_position.is_avialable,
        constraint = order_position.order_position_config == order_position_config.key()
    )]
    pub order_position: Account<'info, OrderPosition>,

    #[account(
        mut,
        constraint = order_position_config.is_valid_order_book_config(order_book_config.key()),
        constraint = order_position_config.is_valid_owner(signer.key()),
    )]
    pub order_position_config: Account<'info, OrderPositionConfig>,

    #[account(
        mut,
        constraint = prev_order_position.is_valid_order_book_config(order_book_config.key()),
    )]
    pub prev_order_position: Option<Account<'info, OrderPosition>>,

    #[account(
        mut,
        constraint = next_order_position.is_valid_order_book_config(order_book_config.key()),
    )]
    pub next_order_position: Option<Account<'info, OrderPosition>>,

    #[account(mut)]
    pub capital_destination: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub source: InterfaceAccount<'info, TokenAccount>,

    pub token_mint: InterfaceAccount<'info, Mint>,
    
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
        // - If it was in the middle, the previous and next orders now point to each other
        // - If it was at the head, the market pointer now points to the next order (or None)
        // - If it was at the tail, the previous order now has its next pointer set to None

        // Mark the order position as unavailable and next order as None
        self.order_position.is_avialable = false;
        self.order_position.next_order_position = None;

        Ok(())
    }

    pub fn refund(&mut self) -> Result<()> {

        // Transfer funds back to the user
        let amount = self.order_position.amount;
        transfer_checked(
            CpiContext::new(
                self.token_program.to_account_info(),
                TransferChecked {
                    from: self.source.to_account_info(),
                    to: self.capital_destination.to_account_info(),
                    authority: self.order_position.to_account_info(),
                    mint: self.token_mint.to_account_info(),
                },
            ),
            amount,
            self.token_mint.decimals,
        )?;

        Ok(())
    }
}

