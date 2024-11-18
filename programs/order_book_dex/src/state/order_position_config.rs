use crate::constants::{DISCRIMINATOR, U64_BYTES};
use anchor_lang::{
    prelude::*,
    solana_program::pubkey::{Pubkey, PUBKEY_BYTES},
};

#[account]
pub struct OrderPositionConfig {
    pub order_book_config: Pubkey,
    pub owner: Pubkey,
    pub capital_a: Pubkey,
    pub capital_b: Pubkey,
    pub nonce: u64,
    pub reference: u64,
}

impl OrderPositionConfig {
    pub const LEN: usize = DISCRIMINATOR + (PUBKEY_BYTES * 4) + (U64_BYTES * 2);

    pub fn init(&mut self, config: Pubkey, owner: Pubkey, capital_a: Pubkey, capital_b: Pubkey) {
        self.order_book_config = config;
        self.owner = owner;
        self.capital_a = capital_a;
        self.capital_b = capital_b;
        self.nonce = 0;
        self.reference = 0;
    }

    pub fn inc_nonce(&mut self) {
        self.nonce += 1;
        self.reference += 1;
    }

    pub fn close_position(&mut self) {
        self.reference -= 1;
    }

    pub fn is_valid_owner(&self, owner: Pubkey) -> bool {
        self.owner == owner
    }

    pub fn is_valid_order_book_config(&self, config: Pubkey) -> bool {
        self.order_book_config == config
    }
}
