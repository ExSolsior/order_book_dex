use crate::db::models::{
    get_market_order_history, get_trade_pair, get_trade_pair_list, insert_trade_pair,
};
use actix_web::{
    get,
    web::{self, Data},
    App, HttpResponse, HttpServer, Responder,
};
use serde::Deserialize;
use sqlx::{postgres::PgPoolOptions, Pool, Postgres};
mod db;
// use solana::pubkey::Pubkey;

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

#[derive(Clone)]
pub struct AppState {
    pub pool: Pool<Postgres>,
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // const DB_URL: &str = "postgres://postgres:somepassword@127.0.0.1:5431/order-book-dex-test";
    const DB_URL: &str = "postgres://postgres:admin0rderb00kdex@127.0.0.1:5431/";

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(DB_URL)
        .await
        .expect("Error building a connection pool.");

    // sqlx::migrate!("./migrations")
    //     .run(&pool)
    //     .await
    //     .expect("Error with migrations.");

    HttpServer::new(move || {
        App::new()
            .app_data(Data::new(AppState { pool: pool.clone() }))
            .service(order_position_list)
            .service(trade_pair_list)
            .service(market_trade_list)
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}

#[get("/order_position_list")]
async fn order_position_list(
    query: web::Query<TradePair>,
    app_state: web::Data<AppState>,
) -> impl Responder {
    match get_trade_pair(query.pubkey_id.clone(), app_state).await {
        Ok(data) => HttpResponse::Ok().json(data),
        Err(_) => HttpResponse::BadRequest().into(),
    }
}

#[get("/market_trade_list")]
async fn market_trade_list(
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
        Err(_) => HttpResponse::Ok().body("json order book config list"),
        // Err(_) => HttpResponse::BadRequest().into(),
    }
}

#[get("/order_book_config_list")]
async fn trade_pair_list(
    query: web::Query<TradePairList>,
    app_state: web::Data<AppState>,
) -> impl Responder {
    match get_trade_pair_list(query.limit, query.offset, app_state).await {
        Ok(data) => HttpResponse::Ok().json(data),
        Err(_) => HttpResponse::BadRequest().into(),
    }
}

// migrate build-script
// docker run --name order-book-dex -e POSTGRES_PASSWORD=admin0rderb00kdex -e POSTGRES_DB=order-book-dex -p 5431:5432 -d postgres
// $ docker run -e POSTGRES_PASSWORD=mysecretpassword -e POSTGRES_USER=dbuser -e POSTGRES_DB=bookstore  -p 5432:5432 postgres:1
// docker exec -it order-book-dex psql -U postgres
// docker stop order-book-dex
// docker rm order-book-dex
// docker ps -a
// docker volume create postgres-data

// persisteded database instance
// docker run --name order-book-dex-test -e POSTGRES_PASSWORD=admin0rderb00kdex -e POSTGRES_DB=order-book-dex -p 5431:5432 -v postgres-data:/var/lib/postgresql/data -d postgres

// sqlx migrate run --database-url postgres://postgres:admin0rderb00kdex@127.0.0.1:5431/
// sqlx migrate info --database-url postgres://postgres:somepassword@127.0.0.1:5431/
// sqlx migrate add core_tables
