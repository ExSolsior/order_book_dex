use crate::db::models::{get_market_order_history, get_trade_pair, get_trade_pair_list};
use actix_web::{get, web, HttpResponse, Responder};
use solana_rpc_client_api::response::{Response, RpcLogsResponse};

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

pub async fn logs_handler(logs_info: Response<RpcLogsResponse>) {
    // let log = logs_info.value.logs[0].clone();

    let logs = logs_info.value.logs;

    // Program data:
    logs.iter().find(|log| println!("{log}"))
}
