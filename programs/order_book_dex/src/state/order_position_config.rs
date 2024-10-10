use crate::constants::{DISCRIMINATOR, U64_BYTES};
use anchor_lang::{
    prelude::*,
    solana_program::pubkey::{Pubkey, PUBKEY_BYTES},
};

#[account]
pub struct OrderPositionConfig {
    pub order_book_config: Pubkey,
    pub owner: Pubkey,
    pub nonce: u64,
}

impl OrderPositionConfig {
    pub const LEN: usize = DISCRIMINATOR + PUBKEY_BYTES + PUBKEY_BYTES + U64_BYTES;

    pub fn init(&mut self, config: Pubkey, owner: Pubkey) {
        self.order_book_config = config;
        self.owner = owner;
        self.nonce = 0;
    }

    pub fn inc_nonce(&mut self) {
        self.nonce += 1;
    }

    pub fn is_valid_owner(&self, owner: Pubkey) -> bool {
        self.owner == owner
    }

    pub fn is_valid_order_book_config(&self, config: Pubkey) -> bool {
        self.order_book_config == config
    }
}
