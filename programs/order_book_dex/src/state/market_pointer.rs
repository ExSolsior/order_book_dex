use std::borrow::Borrow;

use crate::{
    constants::{BYTE, DISCRIMINATOR, U64_BYTES},
    state::{Fill, Order, OrderPosition},
};
use anchor_lang::{
    prelude::*,
    solana_program::pubkey::{Pubkey, PUBKEY_BYTES},
};

#[account]
pub struct MarketPointer {
    pub order_type: Order,
    pub order_book_config: Pubkey,
    pub order_position_pointer: Option<Pubkey>,
    // WIP
    pub current_price: u64,
    pub timestamp: i64,
    pub slot: u64,
    pub market_order: Option<MarketOrder>,
    pub execution_stats: Option<ExecutionStats>,
}

impl MarketPointer {
    pub const LEN: usize = DISCRIMINATOR
        + Order::LEN
        + PUBKEY_BYTES
        + (BYTE + PUBKEY_BYTES)
        + (U64_BYTES * 3)
        + (BYTE + MarketOrder::LEN)
        + (BYTE + ExecutionStats::LEN);

    pub fn init(&mut self, order_type: Order, order_book_config: Pubkey) -> Result<()> {
        let Clock {
            slot,
            unix_timestamp,
            ..
        } = Clock::get()?;

        self.order_type = order_type;
        self.order_book_config = order_book_config;
        self.order_position_pointer = None;
        self.current_price = 0;
        self.timestamp = unix_timestamp;
        self.slot = slot;
        self.market_order = None;
        self.execution_stats = None;

        Ok(())
    }

    pub fn add_market_order(
        &mut self,
        order_type: Order,
        fill: Fill,
        target_amount: u64,
        source_balance: u64,
        owner: Pubkey,
        source: Pubkey,
        dest: Pubkey,
        capital_source: Pubkey,
        capital_dest: Pubkey,
        next_position_pointer: Option<Pubkey>,
    ) -> Result<()> {
        let Clock {
            slot,
            unix_timestamp,
            ..
        } = Clock::get()?;

        self.timestamp = unix_timestamp;
        self.slot = slot;

        self.market_order = Some(MarketOrder {
            order_type,
            fill,
            target_amount,
        });

        self.execution_stats = Some(ExecutionStats {
            source_balance: source_balance,
            dest_balance: 0,
            total_amount: 0,
            total_cost: 0,
            last_price: 0,
            owner,
            capital_source,
            capital_dest,
            source,
            dest,
            next_position_pointer,
        });

        Ok(())
    }

    pub fn remove_market_order(&mut self) -> Result<ExecutionStats> {
        let Clock {
            slot,
            unix_timestamp,
            ..
        } = Clock::get()?;

        let market_data = self.execution_stats.as_mut().unwrap().clone();

        self.timestamp = unix_timestamp;
        self.slot = slot;
        self.market_order = None;
        self.execution_stats = None;

        Ok(market_data)
    }

    pub fn update(
        &mut self,
        order_position: &mut OrderPosition,
        // base_amount
        amount: u64,
        // quote_amount
        pay_amount: u64,
    ) -> Result<()> {
        let Clock {
            slot,
            unix_timestamp,
            ..
        } = Clock::get()?;
        if order_position.is_next() {
            self.order_position_pointer = order_position.next();
        }

        // note about current price, need to think about this
        // need to determine the actual role of current price
        // and if I should be updating the curreint price
        // in accosiation with the order_position that was matched against
        // or to the the next order position?
        self.current_price = order_position.price;
        self.timestamp = unix_timestamp;
        self.slot = slot;

        self.execution_stats.as_mut().unwrap().update(
            &self.order_type,
            amount,
            pay_amount,
            order_position.price,
        );

        Ok(())
    }

    pub fn delta_amount(&self) -> u64 {
        let stats = self.execution_stats.as_ref().unwrap();
        let delta = self.market_order.as_ref().unwrap().target_amount - stats.total_amount;
        return delta;
    }

    pub fn balance(&self, order_position: &OrderPosition) -> u64 {
        let balance = match self.order_type {
            Order::Buy => self.execution_stats.as_ref().unwrap().source_balance,
            Order::Sell => order_position.balance,
            _ => unreachable!(),
        };

        return balance;
    }

    pub fn validate_mutable_status(
        pointer_reader: Option<&Account<'_, MarketPointer>>,
        pointer_writer: Option<&Account<'_, MarketPointer>>,
    ) -> bool {
        !((pointer_reader.is_none() && pointer_writer.is_none())
            || (pointer_reader.is_some() && pointer_writer.is_some()))
    }

    pub fn is_valid_order_book_config(&self, config: Pubkey) -> bool {
        self.order_book_config == config
    }

    pub fn is_valid_order(&self, order_type: Order) -> bool {
        self.order_type == order_type
    }

    pub fn is_valid_availability(&self) -> bool {
        let Clock { slot, .. } = Clock::get().unwrap();
        let delta = slot - self.slot;
        self.market_order.is_none() || delta >= 25
    }

    pub fn is_valid_execution(&self) -> bool {
        self.market_order.is_some()
    }

    pub fn is_valid_market_order_owner(&self, owner: Pubkey) -> bool {
        self.execution_stats.as_ref().unwrap().owner == owner
    }

    // is this correct?
    // I actually have no idea what this is for?
    // I now understand this is for. this logic is wrong.. but I remember what I was trying to do
    // the but old logic got lost.
    pub fn is_valid_order_pointer(&self, order_position: Pubkey) -> bool {
        // I was trying to consider the next_position_pointer. I'll come back to this later
        // for now this is enough for to work in demo
        // self.execution_stats
        //     .as_ref()
        //     .unwrap()
        //     .next_position_pointer
        //     .is_some()
        //     && self
        //         .execution_stats
        //         .as_ref()
        //         .unwrap()
        //         .next_position_pointer
        //         .unwrap()
        //         == order_position

        self.order_position_pointer.as_ref().is_some()
            && self.order_position_pointer.as_ref().unwrap() == &order_position
    }

    pub fn is_valid_position_add(
        &self,
        prev_order_position: Option<&Account<'_, OrderPosition>>,
        next_order_position: Option<&Account<'_, OrderPosition>>,
    ) -> bool {
        if prev_order_position.is_some()
            && next_order_position.is_some()
            && prev_order_position.unwrap().next_order_position.is_some()
        {
            return prev_order_position.unwrap().next_order_position.unwrap()
                == next_order_position.unwrap().key();
        } else if prev_order_position.is_some() && next_order_position.is_none() {
            return prev_order_position.unwrap().next_order_position.is_none();
        } else if self.order_position_pointer.is_some() && next_order_position.is_some() {
            return self.order_position_pointer.unwrap() == next_order_position.unwrap().key();
        } else {
            return self.order_position_pointer.is_none();
        }
    }

    pub fn is_valid_position_remove(
        &self,
        order_position: &Account<'_, OrderPosition>,
        prev_order_position: Option<&Account<'_, OrderPosition>>,
        next_order_position: Option<&Account<'_, OrderPosition>>,
    ) -> bool {
        if prev_order_position.is_some() && next_order_position.is_some() {
            return prev_order_position.unwrap().next_order_position.unwrap()
                == order_position.key()
                && order_position.next_order_position.unwrap()
                    == next_order_position.unwrap().key();
        } else if prev_order_position.is_some() && next_order_position.is_none() {
            return prev_order_position.unwrap().next_order_position.unwrap()
                == order_position.key()
                && order_position.next_order_position.is_none();
        } else if self.order_position_pointer.is_some() && next_order_position.is_some() {
            return self.order_position_pointer.unwrap() == order_position.key()
                && order_position.next_order_position.unwrap()
                    == next_order_position.unwrap().key();
        } else if self.order_position_pointer.is_some() && next_order_position.is_none() {
            return self.order_position_pointer.unwrap() == order_position.key()
                && order_position.next_order_position.is_none();
        } else {
            return self.order_position_pointer.is_none();
        }
    }

    pub fn is_valid_order_type_match(
        &self,
        order_position: Option<&Account<'_, OrderPosition>>,
    ) -> bool {
        order_position.as_ref().is_some()
            && ((order_position.as_ref().unwrap().order_type == Order::Bid
                && self.order_type == Order::Sell)
                || (order_position.as_ref().unwrap().order_type == Order::Ask
                    && self.order_type == Order::Buy))
            || order_position.as_ref().is_none()
    }

    // not sure if this is right?
    // need to review
    pub fn is_valid_open_position_section(
        &self,
        order_position: &Account<'_, OrderPosition>,
        next_position_pointer: Option<&Account<'_, OrderPosition>>,
    ) -> bool {
        if self.execution_stats.is_some()
            && self
                .execution_stats
                .as_ref()
                .unwrap()
                .next_position_pointer
                .is_none()
        {
            return !self
                .execution_stats
                .as_ref()
                .unwrap()
                .next_position_pointer
                .is_none();
        }

        if self.market_order.is_some()
            && next_position_pointer.is_some()
            && self.order_type == Order::Buy
        {
            let position_pointer = self
                .execution_stats
                .as_ref()
                .unwrap()
                .next_position_pointer
                .unwrap();
            let next_position_pointer = next_position_pointer.unwrap();
            return position_pointer == next_position_pointer.key()
                && order_position.price < next_position_pointer.price;
        }

        if self.market_order.is_some()
            && next_position_pointer.is_some()
            && self.order_type == Order::Sell
        {
            let position_pointer = self
                .execution_stats
                .as_ref()
                .unwrap()
                .next_position_pointer
                .unwrap();
            let next_position_pointer = next_position_pointer.unwrap();
            return position_pointer == next_position_pointer.key()
                && order_position.price > next_position_pointer.price;
        }

        return self.market_order.is_none();
    }

    // what is this for?
    pub fn _is_valid_prev_order_position(
        &self,
        prev_order_position: Option<&Account<'_, OrderPosition>>,
    ) -> bool {
        if self.market_order.is_some() && prev_order_position.is_some() {
            return self
                .execution_stats
                .as_ref()
                .unwrap()
                .next_position_pointer
                .is_some()
                && self
                    .execution_stats
                    .as_ref()
                    .unwrap()
                    .next_position_pointer
                    .unwrap()
                    != prev_order_position.unwrap().key();
        }

        return self.market_order.is_none();
    }

    pub fn is_valid_return(&self, owner: Pubkey) -> bool {
        let Clock {
            slot,
            // unix_timestamp,
            ..
        } = match Clock::get() {
            Ok(data) => data,
            _ => return false,
        };

        let delta = slot - self.slot;

        self.market_order.is_some() && self.execution_stats.as_ref().unwrap().owner == owner
            || delta > 20
    }

    pub fn is_valid_source(&self, source: Pubkey) -> bool {
        self.execution_stats.as_ref().unwrap().source == source
    }

    pub fn is_valid_dest(&self, dest: Pubkey) -> bool {
        self.execution_stats.as_ref().unwrap().dest == dest
    }

    pub fn is_valid_fill(&self, current_price: u64) -> bool {
        let order_type = self.order_type.borrow();
        match self.market_order.as_ref().unwrap().fill {
            Fill::Partial { target_price } => {
                Order::Buy == *order_type && current_price <= target_price
                    || Order::Sell == *order_type && current_price >= target_price
            }
            Fill::Full => true,
        }
    }

    pub fn is_valid_contra(&self, order_position: &Account<'_, OrderPosition>) -> bool {
        (self.order_position_pointer.is_some()
            && ((self.order_type == Order::Sell && order_position.price > self.current_price)
                || (self.order_type == Order::Buy && order_position.price < self.current_price)))
            || self.order_position_pointer.is_none()
    }
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct MarketOrder {
    pub order_type: Order,
    pub fill: Fill,
    pub target_amount: u64,
}

impl MarketOrder {
    pub const LEN: usize = Order::LEN + Fill::LEN + U64_BYTES;
}

// need to include balance of both vaults for market orders
#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct ExecutionStats {
    pub owner: Pubkey,
    pub capital_source: Pubkey,
    pub capital_dest: Pubkey,
    pub source: Pubkey,
    pub dest: Pubkey,
    pub next_position_pointer: Option<Pubkey>,

    pub source_balance: u64,
    pub dest_balance: u64,
    pub total_amount: u64,
    pub total_cost: u64,
    pub last_price: u64,
}

impl ExecutionStats {
    pub const LEN: usize = (PUBKEY_BYTES * 5) + (BYTE + PUBKEY_BYTES) + (U64_BYTES * 5);

    pub fn update(&mut self, side: &Order, base_amount: u64, quote_amount: u64, price: u64) {
        self.total_amount += base_amount;
        self.total_cost += quote_amount;
        self.last_price = price;

        match side {
            Order::Buy => {
                self.source_balance -= quote_amount;
                self.dest_balance += base_amount;
            }
            Order::Sell => {
                self.source_balance -= base_amount;
                self.dest_balance += quote_amount;
            }
            _ => unreachable!(),
        }
    }
}
