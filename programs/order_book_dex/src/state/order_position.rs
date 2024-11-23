use crate::{
    constants::{BYTE, DISCRIMINATOR, I64_BYTES, U64_BYTES},
    state::{MarketPointer, Order},
};
use anchor_lang::{
    prelude::*,
    solana_program::pubkey::{Pubkey, PUBKEY_BYTES},
};

#[account]
pub struct OrderPosition {
    pub order_book_config: Pubkey,
    pub order_position_config: Pubkey,
    pub source: Pubkey,
    pub destination: Pubkey,
    pub next_order_position: Option<Pubkey>,
    pub order_type: Order,
    pub price: u64,

    pub size: u64,
    pub fill: u64,
    pub balance: u64,

    pub slot: u64,
    pub timestamp: i64,
    pub is_available: bool,
}

impl OrderPosition {
    pub const LEN: usize = DISCRIMINATOR
        + (PUBKEY_BYTES * 4)
        + (BYTE + PUBKEY_BYTES)
        + Order::LEN
        + (U64_BYTES * 5)
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
        size: u64,
        balance: u64,
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
        self.size = size;
        self.fill = 0;
        self.balance = balance;
        self.timestamp = unix_timestamp;
        self.slot = slot;
        self.is_available = true;

        Ok(())
    }

    pub fn update(&mut self, delta_amount: u128, balance: u128, decimals: u32) -> (u64, u64) {
        let shift = OrderPosition::BASE10.pow(decimals) as u128;
        let amount = (self.size - self.fill) as u128;
        let price = self.price as u128;
        let current_total = price * amount / shift;
        let delta_total = price * delta_amount / shift;

        let total = if balance < delta_total && self.order_type == Order::Ask {
            balance
        } else if delta_total < current_total {
            delta_total
        } else if price * amount % shift != 0 {
            current_total + 1
        } else {
            current_total
        };

        let amount = total * shift / price;

        let total = total as u64;
        let amount = amount as u64;

        match self.order_type {
            Order::Ask => {
                self.balance += total;
            }
            Order::Bid => {
                self.balance -= total;
            }
            _ => unreachable!(),
        }

        if self.fill + amount > self.size {
            self.fill += self.size - self.fill;
        } else {
            self.fill += amount;
        }

        if self.fill == self.size {
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
        self.order_type == Order::Ask && market_pointer.order_type == Order::Buy
            || self.order_type == Order::Bid && market_pointer.order_type == Order::Sell
    }
}
