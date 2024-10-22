use anchor_lang::prelude::*;

pub use order_book_config::*;
pub mod order_book_config;

pub use market_pointer::*;
pub mod market_pointer;

pub use order_position_config::*;
pub mod order_position_config;

pub use order_position::*;
pub mod order_position;

use crate::constants::{BYTE, U64_BYTES};

#[derive(PartialEq, Clone, AnchorSerialize, AnchorDeserialize, Debug)]
pub enum Order {
    Buy,
    Sell,
    Bid,
    Ask,
}

impl Order {
    pub const LEN: usize = BYTE;
}

#[derive(PartialEq, Clone, AnchorSerialize, AnchorDeserialize)]
pub enum Fill {
    Partial { target_price: u64 },
    Full,
}

impl Fill {
    pub const LEN: usize = BYTE + U64_BYTES;
}
