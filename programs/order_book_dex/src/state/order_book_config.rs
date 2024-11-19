use crate::constants::{BYTE, DISCRIMINATOR};
use crate::state::{Order, OrderPosition};
use anchor_lang::{
    prelude::*,
    solana_program::pubkey::{Pubkey, PUBKEY_BYTES},
};

#[account]
pub struct OrderBookConfig {
    pub token_program_a: Pubkey,
    pub token_program_b: Pubkey,
    pub token_mint_a: Pubkey,
    pub token_mint_b: Pubkey,
    pub token_symbol_a: String,
    pub token_symbol_b: String,
    pub is_reverse: bool,
    pub bump: u8,
}

impl OrderBookConfig {
    pub const LEN: usize = DISCRIMINATOR + (PUBKEY_BYTES * 4) + ((BYTE * 12) * 2) + (BYTE * 2);

    pub fn init(
        &mut self,
        token_program_a: Pubkey,
        token_program_b: Pubkey,
        token_mint_a: Pubkey,
        token_mint_b: Pubkey,
        token_symbol_a: String,
        token_symbol_b: String,
        is_reverse: bool,
        bump: u8,
    ) {
        self.token_program_a = token_program_a;
        self.token_program_b = token_program_b;
        self.token_mint_a = token_mint_a;
        self.token_mint_b = token_mint_b;
        self.token_symbol_a = token_symbol_a;
        self.token_symbol_b = token_symbol_b;
        self.is_reverse = is_reverse;
        self.bump = bump
    }

    pub fn is_valid_symbol(symbol: String) -> bool {
        symbol.len() <= 8
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

    pub fn is_valid_config_with_order_position(
        order_book_config: Pubkey,
        order_position: Option<&Account<'_, OrderPosition>>,
    ) -> bool {
        (order_position.as_ref().is_some()
            && order_position.as_ref().unwrap().order_book_config == order_book_config)
            || order_position.as_ref().is_none()
    }

    pub fn is_valid_token_mint_source(&self, source: Pubkey, order_type: Order) -> bool {
        // mint B
        ((!self.is_reverse && (order_type == Order::Ask || order_type == Order::Sell)
            || self.is_reverse && (order_type == Order::Bid || order_type == Order::Buy))
            && source == self.token_mint_b)
            // mint A
            || ((!self.is_reverse && (order_type == Order::Bid || order_type == Order::Buy)
                || self.is_reverse && (order_type == Order::Ask || order_type == Order::Sell))
                && source == self.token_mint_a)
    }

    pub fn is_valid_token_mint_dest(&self, dest: Pubkey, order_type: Order) -> bool {
        // mint A
        ((!self.is_reverse && (order_type == Order::Ask || order_type == Order::Sell)
            || self.is_reverse && (order_type == Order::Bid || order_type == Order::Buy))
            && dest == self.token_mint_a)
            // mint B
            || ((!self.is_reverse && (order_type == Order::Bid || order_type == Order::Buy)
                || self.is_reverse && (order_type == Order::Ask || order_type == Order::Sell))
                && dest == self.token_mint_b)
    }
}
