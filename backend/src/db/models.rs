use crate::AppState;
use actix_web::web;
use sqlx::{postgres::PgRow, prelude::FromRow};

// -> Result<(), Box<dyn Error>>

#[derive(FromRow)]
pub struct TradePair {
    pub pubkey_id: String,
    pub token_mint_a: String,
    pub token_mint_b: String,
    pub token_program_a: String,
    pub token_program_b: String,
    pub sell_market_pointer_pubkey: String,
    pub buy_market_pointer_pubkey: String,
    pub token_mint_a_decimal: String,
    pub token_mint_b_decimal: String,
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

pub struct OrderPosition {
    pub pubkey_id: String,
    pub order_type: String,
    pub price: String,
    pub size: String,
    pub is_available: bool,
    pub next_order_position_pubkey: Option<String>,
    pub order_position_config_pubkey: String,
    pub slot: String,
    pub timestamp: String,
}

pub struct RealTimeTrade {
    order_book_config_pubkey: String,
    order_type: String,
    last_price: String,
    avg_price: String,
    amount: String,
    turnover: String,
    timestamp: String,
    slot: String,
}

#[derive(FromRow)]
pub struct MarketOrderHistory {
    order_book_config_pubkey: String,
    interval: String,
    open: String,
    low: String,
    high: String,
    close: String,
    volume: String,
    turnover: String,
    timestamp: String,
}

pub async fn insert_trade_pair(trade_pair: TradePair, app_state: web::Data<AppState>) {
    sqlx::query(
        r#"
                INSERT INTO order_book_config_table (
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
                    "is_reverse"
                ) VALUES ('$1', '$2', '$3', '$4', '$5', '$6', '$7', $8, $9, '$10', '$11', '$12');
            "#,
    )
    .bind(&trade_pair.pubkey_id)
    .bind(&trade_pair.token_mint_a)
    .bind(&trade_pair.token_mint_b)
    .bind(&trade_pair.token_program_a)
    .bind(&trade_pair.token_program_b)
    .bind(&trade_pair.sell_market_pointer_pubkey)
    .bind(&trade_pair.buy_market_pointer_pubkey)
    .bind(&trade_pair.token_mint_a_decimal)
    .bind(&trade_pair.token_mint_b_decimal)
    .bind(&trade_pair.token_mint_a_symbol)
    .bind(&trade_pair.token_mint_b_symbol)
    .bind(&trade_pair.is_reverse)
    .execute(&app_state.pool)
    .await
    .unwrap();
}

pub async fn insert_order_position_config(
    position_config: PositionConfig,
    app_state: web::Data<AppState>,
) {
    sqlx::query(
        r#"
                INSERT INTO order_position_config_table (
                    "pubkey_id",
                    "order_book_config_pubkey",
                    "market_maker_pubkey",
                    "vault_a_pubkey",
                    "vault_b_pubkey",
                    "nonce",
                    "reference"
                ) VALUES ('$1', '$2', '$3', '$4', '$5', 0, 0);
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

pub async fn insert_order_position(order_position: OrderPosition, app_state: web::Data<AppState>) {
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
                ) VALUES ('$1', '$2', '$3', '$4', '$5', 0, 0);
            "#,
    )
    .bind(&order_position.pubkey_id)
    .bind(&order_position.order_type)
    .bind(&order_position.price)
    .bind(&order_position.size)
    .bind(&order_position.is_available)
    // can be Null, how to handle that?
    .bind(&order_position.next_order_position_pubkey)
    .bind(&order_position.order_position_config_pubkey)
    .bind(&order_position.slot)
    .bind(&order_position.timestamp)
    .execute(&app_state.pool)
    .await
    .unwrap();
}

pub async fn insert_real_time_trade(trade: RealTimeTrade, app_state: web::Data<AppState>) {
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
                ) VALUES ('$1', '$2', '$3', '$4', '$5', '$6', '$7', $8);
            "#,
    )
    .bind(&trade.order_book_config_pubkey)
    .bind(&trade.order_type)
    .bind(&trade.last_price)
    .bind(&trade.avg_price)
    .bind(&trade.amount)
    .bind(&trade.turnover)
    .bind(&trade.timestamp)
    .bind(&trade.slot)
    .execute(&app_state.pool)
    .await
    .unwrap();
}

pub async fn insert_market_order_history(
    market_history: MarketOrderHistory,
    app_state: web::Data<AppState>,
) {
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
                ) VALUES ('$1', '$2', '$3', '$4', '$5', '$6', '$7', $8, $9);
            "#,
    )
    .bind(&market_history.order_book_config_pubkey)
    .bind(&market_history.interval)
    .bind(&market_history.open)
    .bind(&market_history.high)
    .bind(&market_history.low)
    .bind(&market_history.close)
    .bind(&market_history.volume)
    .bind(&market_history.turnover)
    .bind(&market_history.timestamp)
    .execute(&app_state.pool)
    .await
    .unwrap();
}

pub async fn get_trade_pair(
    pubkey_id: String,
    app_state: web::Data<AppState>,
) -> Result<Vec<PgRow>, sqlx::Error> {
    let trade_pair = sqlx::query(
        r#"
            WITH s AS (
                SELECT * FROM order_book_config AS obc
                WHERE obc.pubkey_id == $1
            ), t AS (
                SELECT
                    jsong_agg(
                        op.pubkey_id AS "pubkey_id",
                        opc.pubkey_id AS "order_pos_config",
                        op.next_order_position_pubkey AS "next_order_pos",
                        opc.market_maker_pubkey AS "market_maker_pubkey",
                        op.order_type AS "order_type",
                        op.price AS "price",
                        op.size AS "size",
                        op.is_available AS "is_available" ,

                        CASE
                            WHEN (NOT s.is_reverse AND op.order_type == order_type.bid)
                                OR (s.is_reverse AND op.order_type == order_type.ask)
                                THEN opc.vault_a_pubkey
                            WHEN (NOT s.is_reverse AND op.order_type == order_type.ask)
                                OR (s.is_reverse AND op.order_type == order_type.bid)
                                THEN opc.vault_b_pubkey
                        END AS "source",

                        CASE
                            WHEN (NOT s.is_reverse AND op.order_type == order_type.bid)
                                OR (s.is_reverse AND op.order_type == order_type.ask)
                                THEN opc.vault_b_pubkey
                            WHEN (NOT s.is_reverse AND op.order_type == order_type.ask)
                                OR (s.is_reverse AND op.order_type == order_type.bid)
                                THEN opc.vault_a_pubkey
                        END AS  "destination",

                        op.slot AS "slot",
                        op.timestamp AS "timestamp"
                    ) AS order_position_list

                FROM order_position_config AS opc
                JOIN order_position AS op ON op.order_position_config_pubkey == opc.pubkey_id,
                WHERE opc.order_book_config_pubkey == $1
                ORDER BY op.price ASC
            )

            SELECT
                s.pubkey,
                s.token_mint_a,
                s.token_mint_b,
                s.token_program_a,
                s.token_program_b,
                s.sell_market_pointer,
                s.buy_market_pointer,
                s.token_mint_a_decimal,
                s.token_mint_b_decimal,
                s.token_mint_a_symbol,
                s.token_mint_b_symbol,
                s.is_reverse,
                t.order_position_list,
            FROM s;
        "#,
    )
    .bind(&pubkey_id)
    .fetch_all(&app_state.pool)
    .await;

    return trade_pair;
}

pub async fn get_trade_pair_list(
    limit: String,
    offset: String,
    app_state: web::Data<AppState>,
) -> Result<Vec<TradePair>, sqlx::Error> {
    let query = sqlx::query_as::<_, TradePair>(
        r#"
            -- need order by functionality
            SELECT * FROM order_book_config
            LIMIT $2 
            OFFSET $3;
        "#,
    )
    .bind(&limit)
    .bind(&offset)
    .fetch_all(&app_state.pool)
    .await?;

    Ok(query)
}

pub async fn get_market_order_history(
    pubkey_id: String,
    interval: String,
    limit: String,
    offset: String,
    app_state: web::Data<AppState>,
) -> Result<Vec<MarketOrderHistory>, sqlx::Error> {
    let rows = sqlx::query_as::<_, MarketOrderHistory>(
        r#"
                SELECT * FROM market_order_histry as m
                WHERE m.order_book_config_pubkey == $1 AND interval == $2
                ORDER BY m.timestamp DESC
                LIMIT $3 
                OFFSET $4;
            "#,
    )
    .bind(&pubkey_id)
    .bind(&interval)
    .bind(&limit)
    .bind(&offset)
    .fetch_all(&app_state.pool)
    .await?;

    Ok(rows)
}

pub async fn delete_order_position(pubkey_id: String, app_state: web::Data<AppState>) {
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

pub async fn delete_position_config(pubkey_id: String, app_state: web::Data<AppState>) {
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

pub async fn delete_order_book_config(pubkey_id: String, app_state: web::Data<AppState>) {
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

pub async fn delete_real_trade(id: String, app_state: web::Data<AppState>) {
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

pub async fn update_order_position(
    id: String,
    size: String,
    is_available: bool,
    app_state: web::Data<AppState>,
) {
    sqlx::query(
        r#"
                UPDATE order_position_table SET "is_available" = $1, "size" = $2
                WHERE pubkey_id = $3
            "#,
    )
    .bind(&is_available)
    .bind(&size)
    .bind(&id)
    .execute(&app_state.pool)
    .await
    .unwrap();
}
