use anchor_lang::prelude::*;

use borsh::{BorshDeserialize, BorshSerialize};
pub use order_book_config::*;
pub mod order_book_config;

pub use market_pointer::*;
pub mod market_pointer;

pub use order_position_config::*;
pub mod order_position_config;

pub use order_position::*;
pub mod order_position;

use crate::constants::{BYTE, U64_BYTES};

#[derive(PartialEq, Clone, BorshSerialize, BorshDeserialize)]
pub enum Order {
    Buy,
    Sell,
}

impl Order {
    pub const LEN: usize = BYTE;
}

#[derive(PartialEq, Clone, BorshSerialize, BorshDeserialize)]
pub enum Fill {
    Partial { target_price: u64 },
    Full,
}

impl Fill {
    pub const LEN: usize = BYTE + U64_BYTES;
}
