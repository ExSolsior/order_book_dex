use anchor_lang::{
    prelude::*,
    solana_program::pubkey::{Pubkey, PUBKEY_BYTES},
};

use crate::constants::{BYTE, DISCRIMINATOR};

#[account]
pub struct OrderBookConfig {
    pub token_program_a: Pubkey,
    pub token_program_b: Pubkey,
    pub token_mint_a: Pubkey,
    pub token_mint_b: Pubkey,
    // pub sell_market_pointer: Pubkey,
    // pub buy_market_pointer: Pubkey,
    pub is_reverse: bool,
}

impl OrderBookConfig {
    pub const LEN: usize = DISCRIMINATOR + PUBKEY_BYTES * 4 + BYTE;

    pub fn init(
        &mut self,
        token_program_a: Pubkey,
        token_program_b: Pubkey,
        token_mint_a: Pubkey,
        token_mint_b: Pubkey,
        // sell_market_pointer: Pubkey,
        // buy_market_pointer: Pubkey,
        is_reverse: bool,
    ) {
        self.token_program_a = token_program_a;
        self.token_program_b = token_program_b;
        self.token_mint_a = token_mint_a;
        self.token_mint_b = token_mint_b;
        // self.sell_market_pointer = sell_market_pointer;
        // self.buy_market_pointer = buy_market_pointer;
        self.is_reverse = is_reverse;
    }

    pub fn is_valid_mints(
        token_mint_a: &AccountInfo,
        token_mint_b: &AccountInfo,
        token_program_a: &AccountInfo,
        token_program_b: &AccountInfo,
    ) -> bool {
        token_mint_a.key < token_mint_b.key
            && token_mint_a.owner == token_program_a.key
            && token_mint_b.owner == token_program_b.key
    }
}
