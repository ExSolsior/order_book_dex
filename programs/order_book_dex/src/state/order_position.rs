use crate::{
    constants::{BYTE, DISCRIMINATOR, I64_BYTES, U64_BYTES},
    state::{MarketPointer, Order, OrderBookConfig},
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
    pub is_available: bool,
}

impl OrderPosition {
    pub const LEN: usize = DISCRIMINATOR
        + PUBKEY_BYTES * 4
        + (BYTE + PUBKEY_BYTES)
        + Order::LEN
        + U64_BYTES * 3
        + I64_BYTES
        + BYTE;

    pub const BASE10: u64 = 10;

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
        self.is_available = true;

        Ok(())
    }

    pub fn get_total(balance: u64, cost: u64) -> u64 {
        return if balance > cost { cost } else { balance };
    }

    // how to handle fees?
    // how to handle some other thing that just escaped my mind?
    // how to handle big ints?
    pub fn update(&mut self, delta_amount: u64, balance: u64, decimals: u32) -> (u64, u64) {
        let (amount, total) = if delta_amount >= self.amount {
            self.amount;
            (
                self.amount,
                OrderPosition::get_total(
                    balance,
                    ((self.price as u128 * self.amount as u128)
                        / OrderPosition::BASE10.pow(decimals) as u128) as u64,
                ),
            )
        } else {
            let amount = self.amount - delta_amount;
            (
                amount,
                OrderPosition::get_total(
                    balance,
                    ((self.price as u128 * amount as u128)
                        / OrderPosition::BASE10.pow(decimals) as u128) as u64,
                ),
            )
        };

        let total = if total == 0 { 1 } else { total };

        self.amount -= amount;

        if self.amount == 0 {
            self.is_available = false;
        }

        return (amount, total);
    }

    pub fn is_next(&self) -> bool {
        !self.is_available
    }

    pub fn next(&mut self) -> Option<Pubkey> {
        let next = self.next_order_position;
        self.next_order_position = None;

        return next;
    }

    pub fn is_valid_order_book_config(&self, order_book_config: Pubkey) -> bool {
        self.order_book_config == order_book_config
    }

    pub fn is_valid_order_type_match(&self, market_pointer: &Account<'_, MarketPointer>) -> bool {
        self.order_type == Order::Ask && market_pointer.order_type == Order::Bid
            || self.order_type == Order::Bid && market_pointer.order_type == Order::Sell
    }

    pub fn is_valid_source(
        &self,
        config: &OrderBookConfig,
        source: &TokenAccount,
        order_type: Order,
    ) -> bool {
        ((!config.is_reverse && (order_type == Order::Bid || order_type == Order::Sell)
            || config.is_reverse && (order_type == Order::Ask || order_type == Order::Buy))
            && source.mint == config.token_mint_a)
            || ((!config.is_reverse && (order_type == Order::Ask || order_type == Order::Buy)
                || config.is_reverse && (order_type == Order::Bid || order_type == Order::Sell))
                && source.mint == config.token_mint_b)
    }

    pub fn is_valid_destination(
        &self,
        config: &OrderBookConfig,
        destination: &TokenAccount,
        order_type: Order,
    ) -> bool {
        ((!config.is_reverse && (order_type == Order::Bid || order_type == Order::Sell)
            || config.is_reverse && (order_type == Order::Ask || order_type == Order::Buy))
            && destination.mint == config.token_mint_b)
            || ((!config.is_reverse && (order_type == Order::Ask || order_type == Order::Buy)
                || config.is_reverse && (order_type == Order::Bid || order_type == Order::Sell))
                && destination.mint == config.token_mint_a)
    }
}
