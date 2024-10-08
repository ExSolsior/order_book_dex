use crate::{
    constants::{BYTE, DISCRIMINATOR, I64_BYTES, U64_BYTES},
    state::{ExecutionMarketOrder, MarketPointer, Order, OrderBookConfig},
};
use anchor_lang::{
    prelude::*,
    solana_program::pubkey::{Pubkey, PUBKEY_BYTES},
};
use anchor_spl::token_interface::TokenAccount;

#[account]
pub struct OrderPosition {
    pub order_book_config: Pubkey,
    pub order_position_config: Pubkey,
    pub source: Pubkey,
    pub destination: Pubkey,
    pub next_order_position: Option<Pubkey>,
    pub order_type: Order,
    pub price: u64,
    pub amount: u64,
    pub slot: u64,
    pub timestamp: i64,
    pub is_avialable: bool,
}

impl OrderPosition {
    pub const LEN: usize = DISCRIMINATOR
        + PUBKEY_BYTES * 4
        + (BYTE + PUBKEY_BYTES)
        + Order::LEN
        + U64_BYTES * 3
        + I64_BYTES
        + BYTE;

    pub fn init(
        &mut self,
        order_book_config: Pubkey,
        order_position_config: Pubkey,
        source: Pubkey,
        destination: Pubkey,
        order_type: Order,
        price: u64,
        amount: u64,
    ) -> Result<()> {
        let Clock {
            slot,
            unix_timestamp,
            ..
        } = Clock::get()?;

        self.order_book_config = order_book_config;
        self.order_position_config = order_position_config;
        self.source = source;
        self.destination = destination;
        self.order_type = order_type;
        self.next_order_position = None;
        self.price = price;
        self.amount = amount;
        self.timestamp = unix_timestamp;
        self.slot = slot;
        self.is_avialable = true;

        Ok(())
    }

    pub fn open(&mut self) {}

    pub fn update(&mut self, market_order: &ExecutionMarketOrder) -> u64 {
        let amount = if market_order.amount() >= self.amount {
            self.amount
        } else {
            self.amount - market_order.amount()
        };

        self.amount -= amount;

        if self.amount == 0 {
            self.is_avialable = false;
        }

        return amount;
    }

    pub fn is_next(&self) -> bool {
        !self.is_avialable
    }

    pub fn next(&mut self) -> Option<Pubkey> {
        let next = self.next_order_position;
        self.next_order_position = None;

        return next;
    }

    pub fn is_valid_order_book_config(&self, order_book_config: Pubkey) -> bool {
        self.order_book_config == order_book_config
    }

    // don't think I'll be using this
    pub fn is_valid_order_position_config(&self, order_position_config: Pubkey) -> bool {
        self.order_position_config == order_position_config
    }

    pub fn is_valid_order_type_match(&self, market_pointer: &MarketPointer) -> bool {
        self.order_type == market_pointer.order_type
    }

    pub fn is_valid_source(
        &self,
        config: &OrderBookConfig,
        source: &TokenAccount,
        order_type: Order,
    ) -> bool {
        (!config.is_reverse && order_type == Order::Buy
            || config.is_reverse && order_type == Order::Sell && source.mint == config.token_mint_b)
            || (!config.is_reverse && order_type == Order::Sell
                || config.is_reverse
                    && order_type == Order::Buy
                    && source.mint == config.token_mint_a)
    }

    pub fn is_valid_destination(
        &self,
        config: &OrderBookConfig,
        destination: &TokenAccount,
        order_type: Order,
    ) -> bool {
        (!config.is_reverse && order_type == Order::Buy
            || config.is_reverse
                && order_type == Order::Sell
                && destination.mint == config.token_mint_a)
            || (!config.is_reverse && order_type == Order::Sell
                || config.is_reverse
                    && order_type == Order::Buy
                    && destination.mint == config.token_mint_b)
    }
}
