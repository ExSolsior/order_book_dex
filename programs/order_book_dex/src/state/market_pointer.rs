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
        + U64_BYTES * 2
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
        owner: Pubkey,
        source: Pubkey,
        dest: Pubkey,
        next_position_pointer: Pubkey,
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
            total_amount: 0,
            total_paid: 0,
            owner,
            source,
            dest,
            next_position_pointer,
        });

        Ok(())
    }

    pub fn remove_market_order(&mut self) -> Result<()> {
        let Clock {
            slot,
            unix_timestamp,
            ..
        } = Clock::get()?;

        self.timestamp = unix_timestamp;
        self.slot = slot;
        self.market_order = None;
        self.execution_stats = None;

        Ok(())
    }

    pub fn update(
        &mut self,
        order_position: &mut OrderPosition,
        amount: u64,
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

        self.timestamp = unix_timestamp;
        self.slot = slot;

        self.execution_stats
            .as_mut()
            .unwrap()
            .update(amount, pay_amount);

        Ok(())
    }

    pub fn delta_amount(&self) -> u64 {
        self.market_order.as_ref().unwrap().target_amount
            - self.execution_stats.as_ref().unwrap().total_amount
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
        self.market_order.is_none()
    }

    pub fn is_valid_execution(&self) -> bool {
        self.market_order.is_some()
    }

    pub fn is_valid_market_order_owner(&self, owner: Pubkey) -> bool {
        self.execution_stats.as_ref().unwrap().owner == owner
    }

    pub fn is_valid_order_pointer(&self, order_position: Pubkey) -> bool {
        self.execution_stats.as_ref().unwrap().next_position_pointer == order_position
    }

    pub fn is_valid_position(
        &self,
        prev_order_position: Option<&Account<'_, OrderPosition>>,
        next_order_position: Option<&Account<'_, OrderPosition>>,
    ) -> bool {
        if prev_order_position.is_some() && next_order_position.is_some() {
            return prev_order_position.unwrap().next_order_position.unwrap()
                == next_order_position.unwrap().key();
        } else if self.order_position_pointer.is_some() && next_order_position.is_some() {
            return self.order_position_pointer.unwrap() == next_order_position.unwrap().key();
        } else {
            return self.order_position_pointer.is_none();
        }
    }

    pub fn is_valid_order_type_match(
        &self,
        order_position: Option<&Account<'_, OrderPosition>>,
    ) -> bool {
        (order_position.as_ref().is_some()
            && order_position.as_ref().unwrap().order_type == self.order_type)
            || order_position.as_ref().is_none()
    }

    pub fn is_valid_open_position_section(
        &self,
        order_position: &Account<'_, OrderPosition>,
        next_position_pointer: Option<&Account<'_, OrderPosition>>,
    ) -> bool {
        if self.market_order.is_some()
            && next_position_pointer.is_some()
            && self.order_type == Order::Buy
        {
            let position_pointer = self.execution_stats.as_ref().unwrap().next_position_pointer;
            let next_position_pointer = next_position_pointer.unwrap();
            return position_pointer == next_position_pointer.key()
                && order_position.amount < next_position_pointer.amount;
        }

        if self.market_order.is_some()
            && next_position_pointer.is_some()
            && self.order_type == Order::Sell
        {
            let position_pointer = self.execution_stats.as_ref().unwrap().next_position_pointer;
            let next_position_pointer = next_position_pointer.unwrap();
            return position_pointer == next_position_pointer.key()
                && order_position.amount > next_position_pointer.amount;
        }

        return self.market_order.is_none();
    }

    pub fn is_valid_prev_order_position(
        &self,
        prev_order_position: Option<&Account<'_, OrderPosition>>,
    ) -> bool {
        if self.market_order.is_some() && prev_order_position.is_some() {
            return self.execution_stats.as_ref().unwrap().next_position_pointer
                != prev_order_position.unwrap().key();
        }

        return prev_order_position.is_none();
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

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct ExecutionStats {
    pub owner: Pubkey,
    pub source: Pubkey,
    pub dest: Pubkey,
    pub next_position_pointer: Pubkey,
    pub total_amount: u64,
    pub total_paid: u64,
}

impl ExecutionStats {
    pub const LEN: usize = (PUBKEY_BYTES * 4) + (U64_BYTES * 2);

    pub fn update(&mut self, amount: u64, pay_amount: u64) {
        self.total_amount += amount;
        self.total_paid += pay_amount;
    }
}
