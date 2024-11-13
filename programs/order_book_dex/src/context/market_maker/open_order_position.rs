use crate::{
    errors::ErrorCode,
    events::OpenLimitOrderEvent,
    state::{MarketPointer, OrderBookConfig, OrderPosition, OrderPositionConfig},
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct OpenOrderPosition<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        constraint = MarketPointer::validate_mutable_status(market_pointer_read.as_ref(), market_pointer_write.as_ref())
            @ ErrorCode::InvalidMarketPointer,
        constraint = (market_pointer_write.is_some() && contra_pointer.is_some()) || market_pointer_read.is_some()
    )]
    pub order_book_config: Box<Account<'info, OrderBookConfig>>,

    #[account(
        constraint = market_pointer_read.is_valid_order_book_config(order_book_config.key())
            @ ErrorCode::InvalidMarketPointer,
        constraint = market_pointer_read.is_valid_order_type_match(prev_order_position.as_ref())
            @ ErrorCode::InvalidOrderType,
        constraint = market_pointer_read.is_valid_order_type_match(next_order_position.as_ref())
            @ ErrorCode::InvalidOrderType,
        constraint = market_pointer_read.is_valid_position_add(prev_order_position.as_ref(), next_order_position.as_ref())
            @ ErrorCode::InvalidOrderPositionAdd,
        // constraint = market_pointer_read.is_valid_prev_order_position(prev_order_position.as_ref())
        //     @ ErrorCode::InvalidOrderPosition,
        constraint = market_pointer_read.is_valid_open_position_section(&order_position, next_position_pointer.as_ref())
            @ ErrorCode::InvalidLedgerSection,
        constraint = order_position.is_valid_order_type_match(&market_pointer_read)
            @ ErrorCode::InvalidOrderType,
        constraint = market_pointer_read.order_position_pointer.is_some() 
            && (prev_order_position.is_some() 
                || next_order_position.is_some()
                    && market_pointer_read
                    .order_position_pointer
                    .unwrap() != next_order_position.as_ref().unwrap().key()),
        // edge case if no limit orders exist, then its forced to use writer
        // will come back to improve this
        // does writer need it's own version of this?
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
        constraint = market_pointer_write.is_valid_position_add(prev_order_position.as_ref(), next_order_position.as_ref())
        // what's causing this constrait to trigger?
            @ ErrorCode::InvalidOrderPositionAdd,
        // constraint = market_pointer_write.is_valid_prev_order_position(prev_order_position.as_ref())
        //     @ ErrorCode::InvalidOrderPosition,
        constraint = market_pointer_write.is_valid_open_position_section(&order_position, next_position_pointer.as_ref())
            @ ErrorCode::InvalidLedgerSection,
        constraint = order_position.is_valid_order_type_match(&market_pointer_write)
            @ ErrorCode::InvalidOrderType,
    )]
    pub market_pointer_write: Option<Account<'info, MarketPointer>>,

    #[account(
        // add
        constraint = contra_pointer.is_valid_contra(&order_position)
            @ ErrorCode::InvalidMarketPointerWrite,
    )]
    pub contra_pointer: Option<Account<'info, MarketPointer>>,

    #[account(
        mut,
        constraint = order_position.is_valid_order_book_config(order_book_config.key())
            @ ErrorCode::InvalidOrderPosition,
        constraint = order_position.is_available
            @ ErrorCode::OrderPositionIsNotAvailable,
    )]
    pub order_position: Box<Account<'info, OrderPosition>>,

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
        // something to note and whether or not it is a big issue to solve,
        // there is no validation to check if prev_order_position is on the order book ledger
        // no harm can really come from it just that the order position might not be
        // really added to the ledger, only an issue if there 3rd party clients exist.
        // will review this later if it turns out that it is an issue,
        // and if so just create a flag on order position to solve this
        // -- it looks like though it will be a problem when doing a cancel so I will make the change
    )]
    pub prev_order_position: Option<Account<'info, OrderPosition>>,

    #[account(
        mut,
        constraint = next_order_position.is_valid_order_book_config(order_book_config.key())
            @ ErrorCode::InvalidOrderPosition,
    )]
    pub next_order_position: Option<Account<'info, OrderPosition>>,

    #[account(
        constraint = next_position_pointer.is_valid_order_book_config(order_book_config.key())
            @ ErrorCode::InvalidOrderPosition,
    )]
    pub next_position_pointer: Option<Account<'info, OrderPosition>>,
}

impl<'info> OpenOrderPosition<'info> {
    pub fn exec(&mut self) -> Result<()> {
        if let Some(prev_order_position) = self.prev_order_position.as_mut() {
            prev_order_position.next_order_position = Some(self.order_position.key());
        } else if let Some(market_pointer) = self.market_pointer_write.as_mut() {
            market_pointer.order_position_pointer = Some(self.order_position.key());
        };

        if let Some(next_order_position) = self.next_order_position.as_mut() {
            self.order_position.next_order_position = Some(next_order_position.key());
        } else {
            self.order_position.next_order_position = None;
        };

        if self.market_pointer_write.is_some() {
            self.market_pointer_write.as_mut().unwrap().current_price = self.order_position.price;
        };

        let Clock {
            slot,
            unix_timestamp,
            ..
        } = Clock::get()?;

        emit!(OpenLimitOrderEvent {
            pos_pubkey: self.order_position.key(),
            book_config: self.order_book_config.key(),
            pos_config: self.order_position_config.key(),
            source: self.order_position.source.key(),
            destination: self.order_position.destination.key(),
            parent_position: self.prev_order_position.as_ref().is_some().then(|| self
                .prev_order_position
                .as_ref()
                .unwrap()
                .key()),
            next_pos_pubkey: self.order_position.next_order_position,
            order_type: self.order_position.order_type.clone(),
            price: self.order_position.price,
            size: self.order_position.amount,
            slot: slot,
            timestamp: unix_timestamp,
            is_available: self.order_position.is_available,
            is_head: self.market_pointer_write.is_some(),
        });

        Ok(())
    }
}
