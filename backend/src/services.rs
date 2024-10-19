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

pub fn decode(data: &String) {
    let decoded = general_purpose::STANDARD.decode(data).unwrap();
    let discriminator = &decoded[..8];

    if discriminator == [212, 127, 42, 69, 195, 133, 17, 145] {
        let mut offset = 8;

        let book_config = get_pubkey(&decoded, &mut offset);
        let token_mint_a = get_pubkey(&decoded, &mut offset);
        let token_mint_b = get_pubkey(&decoded, &mut offset);
        let token_program_a = get_pubkey(&decoded, &mut offset);
        let token_program_b = get_pubkey(&decoded, &mut offset);
        let sell_market_pointer = get_pubkey(&decoded, &mut offset);
        let buy_market_pointer = get_pubkey(&decoded, &mut offset);

        let token_symbol_a = get_symbol(&decoded, &mut offset);
        let token_symbol_b = get_symbol(&decoded, &mut offset);

        let length = 1;
        let token_decimals_a = u8::from_be_bytes([decoded[offset as usize]]);
        offset += length;

        let token_decimals_b = u8::from_be_bytes([decoded[offset as usize]]);
        offset += length;

        let is_reverse = u8::from_be_bytes([decoded[offset as usize]]);
        offset += length;

        let length = 8;
        let slot = u64::from_le_bytes(
            decoded[offset as usize..(offset + length) as usize]
                .try_into()
                .expect("expects to be u64"),
        );
        offset += length;

        let length = 8;
        let timestamp = i64::from_le_bytes(
            decoded[offset as usize..(offset + length) as usize]
                .try_into()
                .expect("expects to i64"),
        );

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

    println!("{}", data);
    println!("{:?}, {}", decoded, decoded.len());
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
