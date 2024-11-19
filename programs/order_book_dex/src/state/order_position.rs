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

    pub fn get_total(balance: u64, cost: u64) -> u64 {
        return if balance > cost { cost } else { balance };
    }

    // how to handle fees?
    pub fn update(&mut self, delta_amount: u64, balance: u64, decimals: u32) -> (u64, u64) {
        let amount = self.size - self.fill;
        let (amount, total) = if delta_amount >= amount {
            (
                amount,
                OrderPosition::get_total(
                    balance,
                    ((self.price as u128 * amount as u128)
                        / OrderPosition::BASE10.pow(decimals) as u128) as u64,
                ),
            )
        } else {
            let amount = amount - delta_amount;
            (
                amount,
                OrderPosition::get_total(
                    balance,
                    ((self.price as u128 * amount as u128)
                        / OrderPosition::BASE10.pow(decimals) as u128) as u64,
                ),
            )
        };

        match self.order_type {
            Order::Ask => {
                // old note::: need to rethink if this still applies or if another issues is possible?
                // this could be an issue if balance is 0? but if balance is 0 then no trade should take place?
                // new note... if min traded amount results in zero and is rounded up, then the accumulated total
                // will be significantly higher if it was just one trade that took the who limit order
                // for example
                // size 17 -> decimal 1 -> min base trade is 0.1
                // price 5 -> decimal 0 -> min quote would be 0 at min trade or 1 with base at 0.2
                // at min base trade need to round quote to 1, but market maker will be
                // over paying by 0.5
                // if all trades were like this total will be 170 instead of 85
                // need a process to handle this in the correct manner
                let total = if total == 0 { 1 } else { total };
                self.balance += total;
            }
            Order::Bid => {
                self.balance -= total;
            }
            _ => unreachable!(),
        }

        self.fill += amount;
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
