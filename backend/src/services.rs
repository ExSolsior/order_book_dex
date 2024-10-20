use std::{borrow::Borrow, ops::DerefMut};

use crate::db::models::{get_market_order_history, get_trade_pair, get_trade_pair_list};
use actix_web::{get, web, HttpResponse, Responder};
use base64::engine::{general_purpose, Engine};
use solana_rpc_client_api::response::{Response, RpcLogsResponse};
use solana_sdk::{feature_set::leave_nonce_on_success, pubkey::Pubkey};

use crate::AppState;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct MarketTradeQuery {
    pub pubkey_id: String,
    pub interval: String,
    pub limit: u64,
    pub offset: u64,
}

#[derive(Debug, Deserialize)]
pub struct TradePair {
    pub pubkey_id: String,
}

#[derive(Debug, Deserialize)]
pub struct TradePairList {
    pub limit: u64,
    pub offset: u64,
}

#[get("/market_order_book")]
pub async fn market_order_book(
    query: web::Query<TradePair>,
    app_state: web::Data<AppState>,
) -> impl Responder {
    match get_trade_pair(query.pubkey_id.clone(), app_state).await {
        Ok(data) => HttpResponse::Ok().json(data),
        Err(_) => HttpResponse::BadRequest().into(),
    }
}

#[get("/market_history")]
pub async fn market_history(
    query: web::Query<MarketTradeQuery>,
    app_state: web::Data<AppState>,
) -> impl Responder {
    match get_market_order_history(
        query.pubkey_id.clone(),
        query.interval.clone(),
        query.limit,
        query.offset,
        app_state,
    )
    .await
    {
        Ok(data) => HttpResponse::Ok().json(data),
        Err(_) => HttpResponse::BadRequest().into(),
    }
}

#[get("/market_list")]
pub async fn market_list(
    query: web::Query<TradePairList>,
    app_state: web::Data<AppState>,
) -> impl Responder {
    match get_trade_pair_list(query.limit, query.offset, app_state).await {
        Ok(data) => HttpResponse::Ok().json(data),
        Err(_) => HttpResponse::BadRequest().into(),
    }
}

#[get("/sanity_check")]
pub async fn sanity_check() -> impl Responder {
    HttpResponse::Ok().body("it works")
}

pub fn logs_handler(logs_info: Response<RpcLogsResponse>) {
    println!("------------------------------------------------------------");
    println!("logs pubsub result: {:?}", logs_info);

    let logs = logs_info.value.logs;

    // const PROGRAM_LOG = "Program log: ";
    // const PROGRAM_DATA = "Program data: ";
    // const PROGRAM_LOG_START_INDEX = PROGRAM_LOG.length;
    // const PROGRAM_DATA_START_INDEX = PROGRAM_DATA.length;

    // Program data:
    match logs.iter().find(|log| log.starts_with("Program data: ")) {
        Some(data) => decode(data),
        _ => print!("error"),
    }
}

const CANCEL_LIMIT_ORDER_EVENT: [u8; 8] = [216, 16, 162, 254, 206, 149, 207, 36];
const CLOSE_LIMIT_ORDER_EVENT: [u8; 8] = [37, 48, 113, 193, 242, 130, 158, 58];
const CREATE_ORDER_POSITION_EVENT: [u8; 8] = [172, 251, 54, 147, 127, 165, 156, 166];
const MARKET_ORDER_COMPLETE_EVENT: [u8; 8] = [117, 159, 39, 123, 213, 191, 30, 5];
const MARKET_ORDER_FILL_EVENT: [u8; 8] = [154, 188, 223, 75, 178, 109, 84, 46];
const MARKET_ORDER_TRIGGER_EVENT: [u8; 8] = [72, 184, 141, 82, 42, 180, 101, 73];
const NEW_OPEN_POSITION_EVENT: [u8; 8] = [56, 198, 150, 126, 23, 75, 90, 3];
const NEW_ORDER_BOOK_CONFIG_EVENT: [u8; 8] = [212, 127, 42, 69, 195, 133, 17, 145];
const NEW_ORDER_POSITION_CONFIG_EVENT: [u8; 8] = [135, 248, 180, 220, 179, 224, 202, 103];
const OPEN_LIMIT_ORDER_EVENT: [u8; 8] = [106, 24, 71, 85, 57, 169, 158, 216];

pub fn decode(data: &String) {
    let decoded = general_purpose::STANDARD.decode(data).unwrap();
    let discriminator = decoded[..8].try_into().expect("u8 array size 8");

    match discriminator {
        NEW_ORDER_BOOK_CONFIG_EVENT => parse_order_book_event(&decoded),
        NEW_ORDER_POSITION_CONFIG_EVENT => parse_order_position_config_event(&decoded),
        NEW_OPEN_POSITION_EVENT => parse_open_position_event(&decoded),
        CREATE_ORDER_POSITION_EVENT => parse_create_order_position_event(&decoded),
        OPEN_LIMIT_ORDER_EVENT => parse_open_limit_order_event(&decoded),
        CANCEL_LIMIT_ORDER_EVENT => parse_cancel_limit_order_event(&decoded),
        CLOSE_LIMIT_ORDER_EVENT => parse_close_limit_order_event(&decoded),
        MARKET_ORDER_TRIGGER_EVENT => parse_market_order_trigger_event(&decoded),
        MARKET_ORDER_FILL_EVENT => parse_market_order_fill_event(&decoded),
        MARKET_ORDER_COMPLETE_EVENT => parse_market_order_complete_event(&decoded),
        _ => println!("Invalid Event, log invalid event?"),
    };

    println!("{}", data);
    println!("{:?}, {}", decoded, decoded.len());
}

pub fn parse_order_book_event(data: &[u8]) {
    let mut offset = 8;

    let book_config = get_pubkey(&data, &mut offset);
    let token_mint_a = get_pubkey(&data, &mut offset);
    let token_mint_b = get_pubkey(&data, &mut offset);
    let token_program_a = get_pubkey(&data, &mut offset);
    let token_program_b = get_pubkey(&data, &mut offset);
    let sell_market_pointer = get_pubkey(&data, &mut offset);
    let buy_market_pointer = get_pubkey(&data, &mut offset);
    let token_symbol_a = get_symbol(&data, &mut offset);
    let token_symbol_b = get_symbol(&data, &mut offset);
    let token_decimals_a = get_decimals(&data, &mut offset);
    let token_decimals_b = get_decimals(&data, &mut offset);
    let is_reverse = get_reverse(&data, &mut offset);
    let slot = get_slot(&data, &mut offset);
    let timestamp = get_timestamp(&data, &mut offset);

    println!("{}", book_config);
    println!("{}", token_mint_a);
    println!("{}", token_mint_b);
    println!("{}", token_program_a);
    println!("{}", token_program_b);
    println!("{}", sell_market_pointer);
    println!("{}", buy_market_pointer);
    println!("{}", sell_market_pointer);
    println!("{}", buy_market_pointer);
    println!("{}", token_symbol_a);
    println!("{}", token_symbol_b);
    println!("{}", token_decimals_a);
    println!("{}", token_decimals_b);
    println!("{}", is_reverse);
    println!("{}", slot);
    println!("{}", timestamp);
}

pub fn parse_order_position_config_event(data: &[u8]) {
    let mut offset = 8;
    let book_config = get_pubkey(&data, &mut offset);
    let pos_config = get_pubkey(&data, &mut offset);
    let slot = get_slot(&data, &mut offset);
    let timestamp = get_timestamp(&data, &mut offset);
}

pub fn parse_open_position_event(data: &[u8]) {
    let mut offset = 8;
    let book_config = get_pubkey(&data, &mut offset);
    let pos_config = get_pubkey(&data, &mut offset);
    let pos_pubkey = get_pubkey(&data, &mut offset);
    let slot = get_slot(&data, &mut offset);
    let timestamp = get_timestamp(&data, &mut offset);
}

pub fn parse_create_order_position_event(data: &[u8]) {
    let mut offset = 8;
    let book_config = get_pubkey(&data, &mut offset);
    let pos_config = get_pubkey(&data, &mut offset);
    let pos_pubkey = get_pubkey(&data, &mut offset);
    // need order type
}

pub fn parse_open_limit_order_event(data: &[u8]) {
    let mut offset = 8;
    let pos_pubkey = get_pubkey(&data, &mut offset);
    let book_config = get_pubkey(&data, &mut offset);
    let pos_config = get_pubkey(&data, &mut offset);
    let source = get_pubkey(&data, &mut offset);
    let destination = get_pubkey(&data, &mut offset);

    // handle option -> next_pos_pubkey
    // order_type -> Order enum
    let price = get_slot(&data, &mut offset);
    let size = get_slot(&data, &mut offset);
    let slot = get_slot(&data, &mut offset);
    let timestamp = get_timestamp(&data, &mut offset);
    let is_available = get_reverse(&data, &mut offset);
}

pub fn parse_cancel_limit_order_event(data: &[u8]) {
    let mut offset = 8;
    let pos_pubkey = get_pubkey(&data, &mut offset);
    let book_config = get_pubkey(&data, &mut offset);
    let pos_config = get_pubkey(&data, &mut offset);
    let amount = get_slot(&data, &mut offset);
    let is_available = get_reverse(&data, &mut offset);
}

pub fn parse_close_limit_order_event(data: &[u8]) {
    let mut offset = 8;
    let pos_pubkey = get_pubkey(&data, &mut offset);
    let book_config = get_pubkey(&data, &mut offset);
    let pos_config = get_pubkey(&data, &mut offset);
}

pub fn parse_market_order_trigger_event(data: &[u8]) {
    let mut offset = 8;
    let market_pointer = get_pubkey(&data, &mut offset);
    let book_config = get_pubkey(&data, &mut offset);
    // handle option -> next_pos_pubkey
    // order_type -> Order enum
    let is_available = get_reverse(&data, &mut offset);
    let slot = get_slot(&data, &mut offset);
    let timestamp = get_timestamp(&data, &mut offset);
}

pub fn parse_market_order_fill_event(data: &[u8]) {
    let mut offset = 8;
    let market_pointer = get_pubkey(&data, &mut offset);
    let book_config = get_pubkey(&data, &mut offset);
    // order_type -> Order enum
    let price = get_slot(&data, &mut offset);
    let total = get_slot(&data, &mut offset);
    let amount = get_slot(&data, &mut offset);
    let new_size = get_slot(&data, &mut offset);
    let is_available = get_reverse(&data, &mut offset);
    let slot = get_slot(&data, &mut offset);
    let timestamp = get_timestamp(&data, &mut offset);
}

pub fn parse_market_order_complete_event(data: &[u8]) {
    let mut offset = 8;
    let market_pointer = get_pubkey(&data, &mut offset);
    let book_config = get_pubkey(&data, &mut offset);
    // option new_pointer
    // Order order_type
    let total_cost = get_slot(&data, &mut offset);
    let total_amount = get_slot(&data, &mut offset);
    let last_price = get_slot(&data, &mut offset);
    let is_available = get_reverse(&data, &mut offset);
    let slot = get_slot(&data, &mut offset);
    let timestamp = get_timestamp(&data, &mut offset);
}

pub fn get_pubkey(data: &[u8], offset: &mut u64) -> Pubkey {
    let start = offset.clone() as usize;
    let length = 32;
    let end = start + length as usize;

    *offset += length;

    let pubkey = Pubkey::new_from_array(
        data[start..end]
            .try_into()
            .expect("expect u8 array 32 bytes"),
    );

    return pubkey;
}

pub fn get_symbol(data: &[u8], offset: &mut u64) -> String {
    let start = offset.clone() as usize;
    let length = 4;
    let end = start + length as usize;

    let size = u32::from_le_bytes(data[start..end].try_into().expect("slice")) as usize;

    let start = end;
    let end = start + size;

    *offset += (length + size) as u64;

    return String::from_utf8(data[start..end].to_vec()).unwrap();
}

pub fn get_decimals(data: &[u8], offset: &mut u64) -> u8 {
    let length = 1;
    let value = u8::from_be_bytes([data[*offset as usize]]);
    *offset += length;
    return value;
}

pub fn get_reverse(data: &[u8], offset: &mut u64) -> bool {
    let length = 1;
    let flag = u8::from_be_bytes([data[*offset as usize]]);
    *offset += length;

    if flag == 1 {
        true
    } else {
        false
    }
}

pub fn get_slot(data: &[u8], offset: &mut u64) -> u64 {
    let length = 8;
    let num = u64::from_le_bytes(
        data[*offset as usize..(*offset + length) as usize]
            .try_into()
            .expect("expects to be u64"),
    );
    *offset += length;

    return num;
}

pub fn get_timestamp(data: &[u8], offset: &mut u64) -> i64 {
    let length = 8;
    let num = i64::from_le_bytes(
        data[*offset as usize..(*offset + length) as usize]
            .try_into()
            .expect("expects to i64"),
    );

    *offset += length;

    return num;
}
