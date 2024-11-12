use crate::{ errors::ErrorCode, events::CancelLimitOrderEvent, state::{MarketPointer, OrderBookConfig, OrderPosition, OrderPositionConfig}};
use anchor_lang::prelude::*;

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
    pub order_position_config: Box<Account<'info, OrderPositionConfig>>,

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
            // market_pointer.current_price = self.order_position.price;
        }

        if self.market_pointer_write.is_some() && self.next_order_position.is_some() {
            self.market_pointer_write.as_mut().unwrap().current_price = self.next_order_position.as_ref().unwrap().price;
        } else if self.market_pointer_write.is_some() {
            self.market_pointer_write.as_mut().unwrap().current_price = 0;
        }

        // At this point, the current order has been removed from the linked list:
        // - If it was in the middle, the previous order now points to next order
        // - If it was at the head, the market pointer now points to the next order (or None)
        // - If it was at the tail, the previous order now has its next pointer set to None

        // Mark the order position as unavailable and next order as None
        self.order_position.is_available = false;
        self.order_position.next_order_position = None;

        emit!(CancelLimitOrderEvent {
            pos_pubkey: self.order_position.key(),
            book_config: self.order_book_config.key(),
            pos_config: self.order_position_config.key(),
            amount: self.order_position.amount,
            is_available: self.order_position.is_available,
        });

        Ok(())
    }
}
