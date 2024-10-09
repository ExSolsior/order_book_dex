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
    pub next_position_pointer: Option<Pubkey>,
    pub timestamp: i64,
    pub slot: u64,

    // if fill order is None, it is available for execution of market order
    // could name this market_order instead of fill_order
    pub fill_order: Option<ExecutionMarketOrder>,
}

impl MarketPointer {
    pub const LEN: usize = DISCRIMINATOR
        + PUBKEY_BYTES
        + Order::LEN
        + (BYTE + PUBKEY_BYTES)
        + U64_BYTES * 2
        + (BYTE + ExecutionMarketOrder::LEN);

    pub fn init(&mut self, order_type: Order) -> Result<()> {
        let Clock {
            slot,
            unix_timestamp,
            ..
        } = Clock::get()?;

        self.order_type = order_type;
        self.order_position_pointer = None;
        self.timestamp = unix_timestamp;
        self.slot = slot;
        self.fill_order = None;

        Ok(())
    }

    pub fn add_market_order(
        &mut self,
        order_type: Order,
        fill: Fill,
        target_amount: u64,
        owner: Pubkey,
    ) {
        self.fill_order = Some(ExecutionMarketOrder {
            order_type,
            fill,
            target_amount,
            collected_amount: 0,
            owner,
        });
    }

    pub fn remove_market_order(&mut self) {
        self.fill_order = None;
    }

    pub fn update(&mut self, order_position: &mut OrderPosition, amount: u64) -> Result<()> {
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

        self.fill_order.as_mut().unwrap().update(amount);

        Ok(())
    }

    pub fn is_valid_config(&self, config: Pubkey) -> bool {
        self.order_book_config == config
    }

    pub fn is_valid_order(&self, order_type: Order) -> bool {
        self.order_type == order_type
    }

    pub fn is_valid_availability(&self) -> bool {
        self.fill_order.is_none()
    }

    pub fn is_valid_execution(&self) -> bool {
        self.fill_order.is_some()
    }

    pub fn is_valid_market_order_owner(&self, owner: Pubkey) -> bool {
        self.fill_order.as_ref().unwrap().owner == owner
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
        if self.next_position_pointer.is_some()
            && next_position_pointer.is_some()
            && self.order_type == Order::Buy
        {
            let position_pointer = self.next_position_pointer.unwrap();
            let next_position_pointer = next_position_pointer.unwrap();
            return position_pointer == next_position_pointer.key()
                && order_position.amount < next_position_pointer.amount;
        }

        if self.next_position_pointer.is_some()
            && next_position_pointer.is_some()
            && self.order_type == Order::Sell
        {
            let position_pointer = self.next_position_pointer.unwrap();
            let next_position_pointer = next_position_pointer.unwrap();
            return position_pointer == next_position_pointer.key()
                && order_position.amount > next_position_pointer.amount;
        }

        return self.next_position_pointer.is_none();
    }

    pub fn is_valid_prev_order_position(
        &self,
        prev_order_position: Option<&Account<'_, OrderPosition>>,
    ) -> bool {
        if self.next_position_pointer.is_some() && prev_order_position.is_some() {
            return self.next_position_pointer.unwrap() != prev_order_position.unwrap().key();
        }

        return prev_order_position.is_none();
    }
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct ExecutionMarketOrder {
    pub order_type: Order,
    pub fill: Fill,
    pub target_amount: u64,
    pub collected_amount: u64,
    pub owner: Pubkey,
}

impl ExecutionMarketOrder {
    pub const LEN: usize = Order::LEN + Fill::LEN + U64_BYTES * 2 + PUBKEY_BYTES;

    pub fn update(&mut self, amount: u64) {
        self.collected_amount += amount;
    }

    pub fn amount(&self) -> u64 {
        self.target_amount - self.collected_amount
    }
}
