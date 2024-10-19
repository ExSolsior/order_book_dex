use crate::state::Order;
use anchor_lang::prelude::*;

#[event]
pub struct NewOrderBookConfigEvent {
    pub book_config: Pubkey,
    pub token_mint_a: Pubkey,
    pub token_mint_b: Pubkey,
    pub token_program_a: Pubkey,
    pub token_program_b: Pubkey,
    pub sell_market_pointer: Pubkey,
    pub buy_market_pointer: Pubkey,
    pub token_symbol_a: String,
    pub token_symbol_b: String,
    pub token_decimals_a: u8,
    pub token_decimals_b: u8,
    pub is_reverse: bool,
    pub slot: u64,
    pub timestamp: i64,
}

#[event]
pub struct NewOrderPositionConfigEvent {
    pub book_config: Pubkey,
    pub pos_config: Pubkey,
    pub slot: u64,
    pub timestamp: i64,
}

#[event]
pub struct NewOpenPositionEvent {
    pub book_config: Pubkey,
    pub pos_config: Pubkey,
    pub pos_pubkey: Pubkey,
    pub slot: u64,
    pub timestamp: i64,
}

#[event]
pub struct CreateOrderPositionEvent {
    pub pos_pubkey: Pubkey,
    pub book_config: Pubkey,
    pub pos_config: Pubkey,
    pub order_type: Order,
}

#[event]
pub struct OpenLimitOrderEvent {
    pub pos_pubkey: Pubkey,
    pub book_config: Pubkey,
    pub pos_config: Pubkey,
    pub source: Pubkey,
    pub destination: Pubkey,
    pub next_pos_pubkey: Option<Pubkey>,
    pub order_type: Order,
    pub price: u64,
    pub size: u64,
    pub slot: u64,
    pub timestamp: i64,
    pub is_available: bool,
}

#[event]
pub struct CancelLimitOrderEvent {
    pub pos_pubkey: Pubkey,
    pub book_config: Pubkey,
    pub pos_config: Pubkey,
    pub amount: u64,
    pub is_available: bool,
}

#[event]
pub struct CloseLimitOrderEvent {
    pub pos_pubkey: Pubkey,
    pub book_config: Pubkey,
    pub pos_config: Pubkey,
}

#[event]
pub struct MarketOrderTriggerEvent {
    pub market_pointer: Pubkey,
    pub book_config: Pubkey,
    pub pointer: Option<Pubkey>,
    pub order_type: Order,
    // market_pointer
    pub is_available: bool,
    pub slot: u64,
    pub timestamp: i64,
}

#[event]
pub struct MarketOrderFillEvent {
    pub market_pointer: Pubkey,
    pub book_config: Pubkey,
    pub pos_pubkey: Pubkey,
    pub order_type: Order,
    pub price: u64,
    pub total: u64,
    pub amount: u64,
    pub new_size: u64,
    // order_position
    pub is_available: bool,
    pub slot: u64,
    pub timestamp: i64,
}

#[event]
pub struct MarketOrderCompleteEvent {
    pub market_pointer: Pubkey,
    pub book_config: Pubkey,
    pub new_pointer: Option<Pubkey>,
    pub order_type: Order,
    pub total_cost: u64,
    pub total_amount: u64,
    pub last_price: u64,
    // market_pointer
    pub is_available: bool,
    pub slot: u64,
    pub timestamp: i64,
}
