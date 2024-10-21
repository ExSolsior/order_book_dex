use crate::AppState;
use actix_web::web;
use serde::{Deserialize, Serialize};
use sqlx::{prelude::FromRow, Row};

// -> Result<(), Box<dyn Error>>

#[derive(FromRow, Serialize, Deserialize, Clone)]
pub struct OrderBook {
    pub pubkey_id: String,
    pub token_mint_a: String,
    pub token_mint_b: String,
    pub token_program_a: String,
    pub token_program_b: String,
    pub sell_market_pointer_pubkey: String,
    pub buy_market_pointer_pubkey: String,
    pub token_mint_a_symbol: String,
    pub token_mint_b_symbol: String,
    pub is_reverse: bool,
    pub order_book: String,
}

#[derive(FromRow, Serialize, Deserialize, Clone)]
pub struct TradePair {
    pub pubkey_id: String,
    pub token_mint_a: String,
    pub token_mint_b: String,
    pub token_program_a: String,
    pub token_program_b: String,
    pub sell_market_pointer_pubkey: String,
    pub buy_market_pointer_pubkey: String,
    pub token_mint_a_decimal: u8,
    pub token_mint_b_decimal: u8,
    pub token_mint_a_symbol: String,
    pub token_mint_b_symbol: String,
    pub ticker: String,
    pub is_reverse: bool,
}

pub struct PositionConfig {
    pub pubkey_id: String,
    pub order_book_config_pubkey: String,
    pub market_maker_pubkey: String,
    pub vault_a_pubkey: String,
    pub vault_b_pubkey: String,
}

#[derive(Deserialize)]
pub struct OrderPosition {
    pub pubkey_id: String,
    pub order_type: String,
    pub price: u64,
    pub size: u64,
    pub is_available: bool,
    pub next_order_position_pubkey: Option<String>,
    pub order_position_config_pubkey: String,
    pub slot: u64,
    pub timestamp: u64,
}

pub struct RealTimeTrade {
    pub order_book_config_pubkey: String,
    pub order_type: String,
    pub last_price: u64,
    pub avg_price: u64,
    pub amount: u64,
    pub turnover: u64,
    pub timestamp: u64,
    pub slot: u64,
}

#[derive(FromRow, Serialize, Deserialize)]
pub struct MarketOrderHistory {
    order_book_config_pubkey: String,
    interval: String,
    // should be u32, but I get a fucking error.. need figure out how to handle
    open: i64,
    low: i64,
    high: i64,
    close: i64,
    volume: i64,
    turnover: i64,
    timestamp: i64,
}

pub async fn insert_trade_pair(trade_pair: TradePair, app_state: AppState) {
    sqlx::query(
        r#"
                INSERT INTO order_book_config (
                    "pubkey_id",
                    "token_mint_a", 
                    "token_mint_b", 
                    "token_program_a", 
                    "token_program_b", 
                    "sell_market_pointer_pubkey", 
                    "buy_market_pointer_pubkey", 
                    "token_mint_a_decimal",
                    "token_mint_b_decimal",
                    "token_mint_a_symbol",
                    "token_mint_b_symbol",
                    "ticker",
                    "is_reverse"
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, CAST($8 AS smallint), CAST($9 AS smallint), $10, $11, $12, $13);
            "#,
    )
    .bind(&trade_pair.pubkey_id)
    .bind(&trade_pair.token_mint_a)
    .bind(&trade_pair.token_mint_b)
    .bind(&trade_pair.token_program_a)
    .bind(&trade_pair.token_program_b)
    .bind(&trade_pair.sell_market_pointer_pubkey)
    .bind(&trade_pair.buy_market_pointer_pubkey)
    .bind(&trade_pair.token_mint_a_decimal.to_string())
    .bind(&trade_pair.token_mint_b_decimal.to_string())
    .bind(&trade_pair.token_mint_a_symbol)
    .bind(&trade_pair.token_mint_b_symbol)
    .bind(&trade_pair.ticker)
    .bind(&trade_pair.is_reverse)
    .execute(&app_state.pool)
    .await
    .unwrap();
}

pub async fn insert_order_position_config(position_config: PositionConfig, app_state: AppState) {
    sqlx::query(
        r#"
                INSERT INTO order_position_config (
                    "pubkey_id",
                    "order_book_config_pubkey",
                    "market_maker_pubkey",
                    "vault_a_pubkey",
                    "vault_b_pubkey",
                    "nonce",
                    "reference"
                ) VALUES ($1, $2, $3, $4, $5, 0, 0);
            "#,
    )
    .bind(&position_config.pubkey_id)
    .bind(&position_config.order_book_config_pubkey)
    .bind(&position_config.market_maker_pubkey)
    .bind(&position_config.vault_a_pubkey)
    .bind(&position_config.vault_b_pubkey)
    .execute(&app_state.pool)
    .await
    .unwrap();
}

pub async fn insert_order_position(order_position: OrderPosition, app_state: AppState) {
    sqlx::query(
        r#"
                INSERT INTO order_position_table (
                    "pubkey_id",
                    "order_type",
                    "price",
                    "size",
                    "is_available",
                    "next_order_position_pubkey",
                    "order_position_config_pubkey",
                    "slot",
                    "timestamp"
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0);
            "#,
    )
    .bind(&order_position.pubkey_id)
    .bind(&order_position.order_type)
    .bind(&order_position.price.to_string())
    .bind(&order_position.size.to_string())
    .bind(&order_position.is_available)
    // can be Null, how to handle that?
    .bind(&order_position.next_order_position_pubkey)
    .bind(&order_position.order_position_config_pubkey)
    .bind(&order_position.slot.to_string())
    .bind(&order_position.timestamp.to_string())
    .execute(&app_state.pool)
    .await
    .unwrap();
}

pub async fn insert_real_time_trade(trade: RealTimeTrade, app_state: AppState) {
    sqlx::query(
        r#"
                INSERT INTO order_position_table (
                    "order_book_config_pubkey",
                    "order_type",
                    "last_price",
                    "avg_price",
                    "amount",
                    "turnover",
                    "timestamp",
                    "slot"
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
            "#,
    )
    .bind(&trade.order_book_config_pubkey)
    .bind(&trade.order_type)
    .bind(&trade.last_price.to_string())
    .bind(&trade.avg_price.to_string())
    .bind(&trade.amount.to_string())
    .bind(&trade.turnover.to_string())
    .bind(&trade.timestamp.to_string())
    .bind(&trade.slot.to_string())
    .execute(&app_state.pool)
    .await
    .unwrap();
}

// handled by a schedualer
pub async fn _insert_market_order_history(market_history: MarketOrderHistory, app_state: AppState) {
    sqlx::query(
        r#"
                INSERT INTO order_position_table (
                    "order_book_config_pubkey",
                    "interval",
                    "open",
                    "high",
                    "low",
                    "close",
                    "volume",
                    "turnover",
                    "timestamp"
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
            "#,
    )
    .bind(&market_history.order_book_config_pubkey)
    // this sucker might have issues... ugh! I'll just comment out and insert directly
    // .bind(&market_history.interval)
    .bind(&market_history.open.to_string())
    .bind(&market_history.high.to_string())
    .bind(&market_history.low.to_string())
    .bind(&market_history.close.to_string())
    .bind(&market_history.volume.to_string())
    .bind(&market_history.turnover.to_string())
    .bind(&market_history.timestamp.to_string())
    .execute(&app_state.pool)
    .await
    .unwrap();
}

pub async fn get_trade_pair(
    pubkey_id: String,
    app_state: web::Data<AppState>,
) -> Result<OrderBook, sqlx::Error> {
    let query = sqlx::query(
        r#"
                WITH s AS (
                    SELECT * FROM order_book_config AS obc
                    WHERE obc.pubkey_id = $1
                ), t AS (
                    SELECT
                        op.pubkey_id AS "pubkey_id", 
                        opc.pubkey_id AS "order_pos_config", 
                        op.next_order_position_pubkey AS "next_order_pos", 
                        opc.market_maker_pubkey AS "market_maker_pubkey", 
                        op.order_type AS "order_type", 
                        op.price AS "price", 
                        op.size AS "size", 
                        op.is_available AS  "is_available", 
                        
                        CASE
                            WHEN (NOT s.is_reverse AND op.order_type = 'bid')
                                OR (s.is_reverse AND op.order_type = 'ask')
                                THEN opc.vault_a_pubkey
                            WHEN (NOT s.is_reverse AND op.order_type = 'ask')
                                OR (s.is_reverse AND op.order_type = 'bid')
                                THEN opc.vault_b_pubkey
                        END AS "source",

                        
                        CASE
                            WHEN (NOT s.is_reverse AND op.order_type = 'bid')
                                OR (s.is_reverse AND op.order_type = 'ask')
                                THEN opc.vault_b_pubkey
                            WHEN (NOT s.is_reverse AND op.order_type = 'ask')
                                OR (s.is_reverse AND op.order_type = 'bid')
                                THEN opc.vault_a_pubkey
                        END AS "destination",

                        op.slot AS "slot", 
                        op.timestamp AS "timestamp"

                    FROM order_position_config AS opc
                    JOIN order_position AS op ON op.order_position_config_pubkey = opc.pubkey_id
                    JOIN s ON s.pubkey_id = $1
                    WHERE opc.order_book_config_pubkey = $1
                    ORDER BY op.price ASC

                ), j AS (
                    SELECT
                        $1 AS "pubkey_id",
                        json_agg(
                            json_build_object(
                                'pubkeyId', t.pubkey_id,
                                'orderPosConfig', t.order_pos_config,
                                'nextOrderPos', t.next_order_pos,
                                'marketMakerPubkey', t.market_maker_pubkey,
                                'orderType', t.order_type,
                                'price', t.price,
                                'size', t.size,
                                'isAvailable', t.is_available,
                                'source', t.source,
                                'destination', t.destination,
                                'slot', t.slot,
                                'timestamp', t.timestamp
                            )
                        ) as list
                    FROM t
                    JOIN s ON s.pubkey_id = $1
                    GROUP BY s.pubkey_id
                )

                SELECT
                    s.pubkey_id,
                    s.token_mint_a,
                    s.token_mint_b,
                    s.token_program_a,
                    s.token_program_b,
                    s.sell_market_pointer_pubkey,
                    s.buy_market_pointer_pubkey,
                    s.token_mint_a_decimal,
                    s.token_mint_b_decimal,
                    s.token_mint_a_symbol,
                    s.token_mint_b_symbol,
                    s.is_reverse,
                    j.list
                FROM s
                JOIN j ON s.pubkey_id = j.pubkey_id; 
        "#,
    )
    .bind(&pubkey_id)
    .fetch_one(&app_state.pool)
    .await?;

    Ok(OrderBook {
        pubkey_id: query.get("pubkey_id"),
        token_mint_a: query.get("token_mint_a"),
        token_mint_b: query.get("token_mint_b"),
        token_program_a: query.get("token_program_a"),
        token_program_b: query.get("token_program_b"),
        sell_market_pointer_pubkey: query.get("sell_market_pointer_pubkey"),
        buy_market_pointer_pubkey: query.get("buy_market_pointer_pubkey"),
        token_mint_a_symbol: query.get("token_mint_a_symbol"),
        token_mint_b_symbol: query.get("token_mint_b_symbol"),
        is_reverse: query.get("is_reverse"),
        order_book: String::from(query.try_get_raw("list").unwrap().as_str().unwrap()),
    })
}

// need to figure out how to use u64 or larger with postgress
pub async fn get_trade_pair_list(
    limit: u64,
    offset: u64,
    app_state: web::Data<AppState>,
) -> Result<Vec<TradePair>, sqlx::Error> {
    let query = sqlx::query(
        r#"
            -- need order by functionality
            SELECT * FROM order_book_config
            LIMIT $1
            OFFSET $2;
        "#,
    )
    .bind(limit as i64)
    .bind(offset as i64)
    .fetch_all(&app_state.pool)
    .await?;

    let list = query
        .iter()
        .map(|row| TradePair {
            pubkey_id: row.try_get("pubkey_id").unwrap(),
            token_mint_a: row.try_get("token_mint_a").unwrap(),
            token_mint_b: row.try_get("token_mint_b").unwrap(),
            token_program_a: row.try_get("token_program_a").unwrap(),
            token_program_b: row.try_get("token_program_b").unwrap(),
            sell_market_pointer_pubkey: row.try_get("sell_market_pointer_pubkey").unwrap(),
            buy_market_pointer_pubkey: row.try_get("buy_market_pointer_pubkey").unwrap(),

            // WHAT THE FUCK???
            token_mint_a_decimal: u8::from_be_bytes([row
                .try_get_raw("token_mint_a_decimal")
                .unwrap()
                .as_bytes()
                .unwrap()[1]]),

            // WHAT THE FUCK???
            token_mint_b_decimal: u8::from_be_bytes([row
                .try_get_raw("token_mint_b_decimal")
                .unwrap()
                .as_bytes()
                .unwrap()[1]]),

            token_mint_a_symbol: row.try_get("token_mint_a_symbol").unwrap(),
            token_mint_b_symbol: row.try_get("token_mint_b_symbol").unwrap(),
            ticker: row.try_get("ticker").unwrap(),
            is_reverse: row.try_get("is_reverse").unwrap(),
        })
        .collect::<Vec<_>>();

    Ok(list)
}

pub async fn get_market_order_history(
    pubkey_id: String,
    interval: String,
    limit: u64,
    offset: u64,
    app_state: web::Data<AppState>,
) -> Result<Vec<MarketOrderHistory>, sqlx::Error> {
    let query = sqlx::query(&format!(
        r#"
                -- can't do this like this
                -- SET intervalstyle = iso_8601;

                SELECT 
                    *,
                    CAST(m.interval AS TEXT) AS interval
                FROM market_order_history as m
                WHERE m.order_book_config_pubkey = $1
                AND m.interval = '{}'
                ORDER BY m.timestamp DESC
                LIMIT $2
                OFFSET $3;
            "#,
        interval
    ))
    .bind(pubkey_id)
    // well I can'g get this bind to work so I just insert it directly into the SQL
    // .bind(interval)
    .bind(limit as i64)
    .bind(offset as i64)
    .fetch_all(&app_state.pool)
    .await?;

    println!("this");

    let list = query
        .iter()
        .map(|row| MarketOrderHistory {
            order_book_config_pubkey: row.try_get("order_book_config_pubkey").unwrap(),
            interval: interval.clone(),
            open: row.try_get("open").unwrap(),
            high: row.try_get("high").unwrap(),
            low: row.try_get("low").unwrap(),
            close: row.try_get("close").unwrap(),
            volume: row.try_get("volume").unwrap(),
            turnover: row.try_get("turnover").unwrap(),
            timestamp: row.try_get("timestamp").unwrap(),
        })
        .collect::<Vec<_>>();

    Ok(list)
}

pub async fn delete_order_position(pubkey_id: String, app_state: AppState) {
    sqlx::query(
        r#"
                DELETE FROM order_position
                WHERE pubkey_id == $1;
            "#,
    )
    .bind(&pubkey_id)
    .execute(&app_state.pool)
    .await
    .unwrap();
}

// functionality not implemented yet
pub async fn _delete_position_config(pubkey_id: String, app_state: AppState) {
    sqlx::query(
        r#"
                DELETE FROM order_position_config
                WHERE pubkey_id == $1;
            "#,
    )
    .bind(&pubkey_id)
    .execute(&app_state.pool)
    .await
    .unwrap();
}

// functionality not implemented yet
pub async fn _delete_order_book_config(pubkey_id: String, app_state: AppState) {
    sqlx::query(
        r#"
                DELETE FROM order_book_config
                WHERE pubkey_id == $1;
            "#,
    )
    .bind(&pubkey_id)
    .execute(&app_state.pool)
    .await
    .unwrap();
}

// handled by a schedualer
pub async fn _delete_real_trade(id: String, app_state: AppState) {
    sqlx::query(
        r#"
                DELETE FROM real_time_trade_data
                WHERE id == $1;
            "#,
    )
    .bind(&id)
    .execute(&app_state.pool)
    .await
    .unwrap();
}

pub async fn update_order_position(id: String, size: u64, is_available: bool, app_state: AppState) {
    sqlx::query(
        r#"
                UPDATE order_position SET "is_available" = $1, "size" = $2
                WHERE pubkey_id = $3
            "#,
    )
    .bind(&is_available)
    .bind(&size.to_string())
    .bind(&id)
    .execute(&app_state.pool)
    .await
    .unwrap();
}
