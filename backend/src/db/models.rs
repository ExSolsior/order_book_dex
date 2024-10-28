use {
    crate::AppState,
    actix_web::web,
    chrono::prelude::*,
    serde::{Deserialize, Serialize},
    serde_json::value::Value,
    solana_sdk::pubkey::Pubkey,
    sqlx::{prelude::FromRow, Pool, Postgres, Row},
};

#[derive(FromRow, Serialize, Deserialize, Clone)]
pub struct TradePair {
    pub pubkey_id: Pubkey,
    pub token_mint_a: Pubkey,
    pub token_mint_b: Pubkey,
    pub token_program_a: Pubkey,
    pub token_program_b: Pubkey,
    pub sell_market: Pubkey,
    pub buy_market: Pubkey,
    pub token_decimals_a: u8,
    pub token_decimals_b: u8,
    pub token_symbol_a: String,
    pub token_symbol_b: String,
    pub ticker: String,
    pub is_reverse: bool,
}

pub struct PositionConfig {
    pub pubkey_id: Pubkey,
    pub book_config: Pubkey,
    pub market_maker: Pubkey,
    pub capital_a: Pubkey,
    pub capital_b: Pubkey,
    pub vault_a: Pubkey,
    pub vault_b: Pubkey,
}

#[derive(Deserialize)]
pub struct OrderPosition {
    pub pubkey_id: Pubkey,
    pub order_type: String,
    pub price: u64,
    pub size: u64,
    pub is_available: bool,
    pub next_position: Option<Pubkey>,
    pub position_config: Pubkey,
    pub book_config: Pubkey,
    pub source_vault: Pubkey,
    pub destination_vault: Pubkey,
    pub slot: u64,
    pub timestamp: u64,
}

pub struct RealTimeTrade {
    pub book_config: String,
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
                    "sell_market", 
                    "buy_market", 
                    "token_decimals_a",
                    "token_decimals_b",
                    "token_symbol_a",
                    "token_symbol_b",
                    "ticker",
                    "is_reverse"
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13);
            "#,
    )
    .bind(&trade_pair.pubkey_id.to_string())
    .bind(&trade_pair.token_mint_a.to_string())
    .bind(&trade_pair.token_mint_b.to_string())
    .bind(&trade_pair.token_program_a.to_string())
    .bind(&trade_pair.token_program_b.to_string())
    .bind(&trade_pair.sell_market.to_string())
    .bind(&trade_pair.buy_market.to_string())
    .bind(trade_pair.token_decimals_a as i16)
    .bind(trade_pair.token_decimals_b as i16)
    .bind(&trade_pair.token_symbol_a)
    .bind(&trade_pair.token_symbol_b)
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
                    "book_config",
                    "market_maker",
                    "capital_a,
                    "capital_b,
                    "vault_a",
                    "vault_b",
                    "nonce",
                    "reference"
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0);
            "#,
    )
    .bind(&position_config.pubkey_id.to_string())
    .bind(&position_config.book_config.to_string())
    .bind(&position_config.market_maker.to_string())
    .bind(&position_config.capital_a.to_string())
    .bind(&position_config.capital_b.to_string())
    .bind(&position_config.vault_a.to_string())
    .bind(&position_config.vault_b.to_string())
    .execute(&app_state.pool)
    .await
    .unwrap();
}

pub async fn insert_order_position(order_position: OrderPosition, app_state: AppState) {
    let query = sqlx::query(
        r#"
                INSERT INTO order_position (
                    "pubkey_id",
                    "booK_config"
                    "position_config",
                    "next_position",
                    "source_vault",
                    "destination_vault",
                    "order_type",
                    "price",
                    "size",
                    "is_available",
                    "slot",
                    "timestamp"
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0, 0);
            "#,
    )
    .bind(order_position.pubkey_id.to_string())
    .bind(order_position.book_config.to_string())
    .bind(order_position.position_config.to_string());

    let query = if order_position.next_position.is_some() {
        query.bind(order_position.next_position.unwrap().to_string())
    } else {
        query.bind(Option::<String>::None)
    };

    query
        .bind(order_position.source_vault.to_string())
        .bind(order_position.destination_vault.to_string())
        .bind(order_position.order_type.to_string())
        .bind(order_position.price.to_string())
        .bind(order_position.size.to_string())
        .bind(order_position.is_available)
        .bind(order_position.slot.to_string())
        .bind(order_position.timestamp.to_string())
        .execute(&app_state.pool)
        .await
        .unwrap();
}

pub async fn insert_real_time_trade(trade: RealTimeTrade, app_state: AppState) {
    sqlx::query(
        r#"
                INSERT INTO real_time_trade_data (
                    "book_config",
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
    .bind(&trade.book_config)
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

// handled by a scheduler
pub async fn insert_market_order_history(pool: &Pool<Postgres>) {
    let dt: DateTime<Utc> = Utc::now();
    let time = dt.timestamp() / 60 * 60;

    sqlx::raw_sql(
        &format!(
            r#"
                BEGIN;

                WITH chart AS (
                    SELECT 
                        * 
                    FROM real_time_trade_data AS td
                    WHERE {time} - 60 <= td.timestamp AND {time} > td.timestamp

                ), open_time AS (
                    SELECT 
                        MIN("timestamp") AS "timestamp",
                        book_config
                    FROM chart
                    GROUP BY book_config

                ), close_time AS (
                    SELECT 
                        MAX("timestamp") AS "timestamp",
                        book_config
                    FROM chart
                    GROUP BY book_config

                ), open_price AS (
                    SELECT 
                        t.book_config,
                        last_price
                    FROM chart 
                    JOIN open_time AS t ON t.book_config = chart.book_config
                    AND t.timestamp = chart.timestamp

                ), close_price AS (
                    SELECT 
                        t.book_config,
                        last_price
                    FROM chart 
                    JOIN close_time AS t ON t.book_config = chart.book_config
                    AND t.timestamp = chart.timestamp

                ), low_price AS (
                    SELECT 
                        book_config,
                        MIN(chart.last_price) AS last_price
                    FROM chart 
                    GROUP BY book_config

                ), high_price AS (
                    SELECT 
                        book_config,
                        MAX(chart.last_price) AS last_price
                    FROM chart 
                    GROUP BY book_config

                ), total AS (
                    SELECT 
                        book_config,
                        sum(chart.amount) AS "volume",
                        sum(chart.last_price) AS "turnover"
                    FROM chart
                    GROUP BY book_config

                ), bars AS (
                    SELECT 
                        DISTINCT chart.book_config AS "book_config",
                        '1m'::interval AS interval,
                        o.last_price  AS "open",
                        h.last_price as "high",
                        l.last_price as "low",
                        c.last_price  AS "close",
                        t.volume,
                        t.turnover,
                        {time} AS "timestamp"

                    FROM chart
                    INNER JOIN open_price AS o ON o.book_config = chart.book_config
                    INNER JOIN high_price AS h ON h.book_config = chart.book_config
                    INNER JOIN low_price AS l ON l.book_config = chart.book_config
                    INNER JOIN close_price AS c ON c.book_config = chart.book_config
                    INNER JOIN total AS t ON t.book_config = chart.book_config

                    UNION
                    SELECT * FROM market_order_history AS m
                    WHERE m.timestamp <= {time} - (60 * 60)
                    AND m.interval = '1m'::interval

                    UNION
                    SELECT * FROM market_order_history AS m
                    WHERE m.timestamp <= {time} - (60 * 60 * 24)
                    AND m.interval = '1h'::interval

                    UNION
                    SELECT * FROM market_order_history AS m
                    WHERE m.timestamp <= {time} - (60 * 60 * 24 * 366)
                    AND m.interval = '1d'::interval

                ), minute_data AS (
                    SELECT
                        book_config,
                        SUM(m.open) AS "open",
                        SUM(m.high) AS "high",
                        SUM(m.low) AS "low",
                        SUM(m.close) AS "close",
                        SUM(m.volume) AS "volume",
                        SUM(m.turnover) AS "turnover"

                    FROM bars AS m
                    WHERE m.interval = '1m'::interval
                    AND m.timestamp = {time}
                    GROUP BY m.book_config

                ), minute_2_data AS (
                    SELECT
                        book_config,
                        SUM(m.open) AS "open",
                        SUM(m.high) AS "high",
                        SUM(m.low) AS "low",
                        SUM(m.close) AS "close",
                        SUM(m.volume) AS "volume",
                        SUM(m.turnover) AS "turnover"

                    FROM bars AS m
                    WHERE ({time} - ({time} / 1440 * 1440)) % (60 * 2) = 0
                    AND m.timestamp >= {time} - (60 * 2)
                    AND m.interval = '1m'::interval
                    GROUP BY m.book_config

                ), minute_3_data AS (
                    SELECT
                        book_config,
                        SUM(m.open) AS "open",
                        SUM(m.high) AS "high",
                        SUM(m.low) AS "low",
                        SUM(m.close) AS "close",
                        SUM(m.volume) AS "volume",
                        SUM(m.turnover) AS "turnover"

                    FROM bars AS m
                    WHERE ({time} - ({time} / 1440 * 1440)) % (60 * 3) = 0
                    AND m.timestamp >= {time} - (60 * 3)
                    AND m.interval = '1m'::interval
                    GROUP BY m.book_config

                ), minute_4_data AS (
                    SELECT
                        book_config,
                        SUM(m.open) AS "open",
                        SUM(m.high) AS "high",
                        SUM(m.low) AS "low",
                        SUM(m.close) AS "close",
                        SUM(m.volume) AS "volume",
                        SUM(m.turnover) AS "turnover"

                    FROM bars AS m
                    WHERE ({time} - ({time} / 1440 * 1440)) % (60 * 4) = 0
                    AND m.timestamp >= {time} - (60 * 4)
                    AND m.interval = '1m'::interval
                    GROUP BY m.book_config

                ), minute_5_data AS (
                    SELECT
                        book_config,
                        SUM(m.open) AS "open",
                        SUM(m.high) AS "high",
                        SUM(m.low) AS "low",
                        SUM(m.close) AS "close",
                        SUM(m.volume) AS "volume",
                        SUM(m.turnover) AS "turnover"

                    FROM bars AS m
                    WHERE ({time} - ({time} / 1440 * 1440)) % (60 * 5) = 0
                    AND m.timestamp >= {time} - (60 * 5)
                    AND m.interval = '1m'::interval
                    GROUP BY m.book_config

                ), minute_10_data AS (
                    SELECT
                        book_config,
                        SUM(m.open) AS "open",
                        SUM(m.high) AS "high",
                        SUM(m.low) AS "low",
                        SUM(m.close) AS "close",
                        SUM(m.volume) AS "volume",
                        SUM(m.turnover) AS "turnover"

                    FROM bars AS m
                    WHERE ({time} - ({time} / 1440 * 1440)) % (60 * 10) = 0
                    AND m.timestamp >= {time} - (60 * 10)
                    AND m.interval = '1m'::interval
                    GROUP BY m.book_config

                ), minute_15_data AS (
                    SELECT
                        book_config,
                        SUM(m.open) AS "open",
                        SUM(m.high) AS "high",
                        SUM(m.low) AS "low",
                        SUM(m.close) AS "close",
                        SUM(m.volume) AS "volume",
                        SUM(m.turnover) AS "turnover"

                    FROM bars AS m
                    WHERE ({time} - ({time} / 1440 * 1440)) % (60 * 15) = 0
                    AND m.timestamp >= {time} - (60 * 15)
                    AND m.interval = '1m'::interval
                    GROUP BY m.book_config

                ), minute_20_data AS (
                    SELECT
                        book_config,
                        SUM(m.open) AS "open",
                        SUM(m.high) AS "high",
                        SUM(m.low) AS "low",
                        SUM(m.close) AS "close",
                        SUM(m.volume) AS "volume",
                        SUM(m.turnover) AS "turnover"

                    FROM bars AS m
                    WHERE ({time} - ({time} / 1440 * 1440)) % (60 * 20) = 0
                    AND m.timestamp >= {time} - (60 * 20)
                    AND m.interval = '1m'::interval
                    GROUP BY m.book_config

                ), minute_30_data AS (
                    SELECT
                        book_config,
                        SUM(m.open) AS "open",
                        SUM(m.high) AS "high",
                        SUM(m.low) AS "low",
                        SUM(m.close) AS "close",
                        SUM(m.volume) AS "volume",
                        SUM(m.turnover) AS "turnover"

                    FROM bars AS m
                    WHERE ({time} - ({time} / 1440 * 1440)) % (60 * 30) = 0
                    AND m.timestamp >= {time} - (60 * 30)
                    AND m.interval = '1m'::interval
                    GROUP BY m.book_config

                ), hour_data AS (
                    SELECT 
                        book_config,
                        SUM(m.open) AS "open",
                        SUM(m.high) AS "high",
                        SUM(m.low) AS "low",
                        SUM(m.close) AS "close",
                        SUM(m.volume) AS "volume",
                        SUM(m.turnover) AS "turnover"

                    FROM bars AS m
                    WHERE {time} % 1440 = 0 
                    AND m.timestamp >= {time} - 1440
                    AND m.interval = '1m'::interval
                    GROUP BY m.book_config

                ), hour_2_data AS (
                    SELECT 
                        book_config,
                        SUM(h.open) AS "open",
                        SUM(h.high) AS "high",
                        SUM(h.low) AS "low",
                        SUM(h.close) AS "close",
                        SUM(h.volume) AS "volume",
                        SUM(h.turnover) AS "turnover"

                    FROM bars AS h
                    WHERE ({time} - ({time} / 86400 * 86400)) % (1440 * 2) = 0
                    AND h.timestamp >= {time} - (1440 * 2)
                    AND h.interval = '1h'::interval
                    GROUP BY h.book_config

                ), hour_3_data AS (
                    SELECT 
                        book_config,
                        SUM(h.open) AS "open",
                        SUM(h.high) AS "high",
                        SUM(h.low) AS "low",
                        SUM(h.close) AS "close",
                        SUM(h.volume) AS "volume",
                        SUM(h.turnover) AS "turnover"

                    FROM bars AS h
                    WHERE ({time} - ({time} / 86400 * 86400)) % (1440 * 3) = 0
                    AND h.timestamp >= {time} - (1440 * 3)
                    AND h.interval = '1h'::interval
                    GROUP BY h.book_config

                ), hour_4_data AS (
                    SELECT 
                        book_config,
                        SUM(h.open) AS "open",
                        SUM(h.high) AS "high",
                        SUM(h.low) AS "low",
                        SUM(h.close) AS "close",
                        SUM(h.volume) AS "volume",
                        SUM(h.turnover) AS "turnover"

                    FROM bars AS h
                    WHERE ({time} - ({time} / 86400 * 86400)) % (1440 * 4) = 0
                    AND h.timestamp >= {time} - (1440 * 4)
                    AND h.interval = '1h'::interval
                    GROUP BY h.book_config

                ), hour_6_data AS (
                    SELECT 
                        book_config,
                        SUM(h.open) AS "open",
                        SUM(h.high) AS "high",
                        SUM(h.low) AS "low",
                        SUM(h.close) AS "close",
                        SUM(h.volume) AS "volume",
                        SUM(h.turnover) AS "turnover"

                    FROM bars AS h
                    WHERE ({time} - ({time} / 86400 * 86400)) % (1440 * 6) = 0
                    AND h.timestamp >= {time} - (1440 * 6)
                    AND h.interval = '1h'::interval
                    GROUP BY h.book_config

                ), hour_8_data AS (
                    SELECT 
                        book_config,
                        SUM(h.open) AS "open",
                        SUM(h.high) AS "high",
                        SUM(h.low) AS "low",
                        SUM(h.close) AS "close",
                        SUM(h.volume) AS "volume",
                        SUM(h.turnover) AS "turnover"

                    FROM bars AS h
                    WHERE ({time} - ({time} / 86400 * 86400)) % (1440 * 8) = 0
                    AND h.timestamp >= {time} - (1440 * 8)
                    AND h.interval = '1h'::interval
                    GROUP BY h.book_config

                ), hour_12_data AS (
                    SELECT 
                        book_config,
                        SUM(h.open) AS "open",
                        SUM(h.high) AS "high",
                        SUM(h.low) AS "low",
                        SUM(h.close) AS "close",
                        SUM(h.volume) AS "volume",
                        SUM(h.turnover) AS "turnover"

                    FROM bars AS h
                    WHERE ({time} - ({time} / 86400 * 86400)) % (1440 * 12) = 0
                    AND h.timestamp >= {time} - (1440 * 12)
                    AND h.interval = '1h'::interval
                    GROUP BY h.book_config

                ), day_data AS (
                    SELECT 
                        book_config,
                        SUM(h.open) AS "open",
                        SUM(h.high) AS "high",
                        SUM(h.low) AS "low",
                        SUM(h.close) AS "close",
                        SUM(h.volume) AS "volume",
                        SUM(h.turnover) AS "turnover"

                    FROM bars AS h
                    WHERE {time} % 86400 = 0 
                    AND h.timestamp >= {time} - 86400
                    AND h.interval = '1h'::interval
                    GROUP BY h.book_config

                ), day_2_data AS (
                    SELECT
                        book_config,
                        SUM(d.open) AS "open",
                        SUM(d.high) AS "high",
                        SUM(d.low) AS "low",
                        SUM(d.close) AS "close",
                        SUM(d.volume) AS "volume",
                        SUM(d.turnover) AS "turnover"

                    FROM bars AS d
                    WHERE ({time} - ({time} / (86400 * 7) * (86400 * 7))) % (86400 * 2) = 0
                    AND d.timestamp >= {time} - (86400 * 2)
                    AND d.interval = '1d'::interval
                    GROUP BY d.book_config

                ), day_3_data AS (
                    SELECT
                        book_config,
                        SUM(d.open) AS "open",
                        SUM(d.high) AS "high",
                        SUM(d.low) AS "low",
                        SUM(d.close) AS "close",
                        SUM(d.volume) AS "volume",
                        SUM(d.turnover) AS "turnover"

                    FROM bars AS d
                    WHERE ({time} - ({time} / (86400 * 7) * (86400 * 7))) % (86400 * 3) = 0
                    AND d.timestamp >= {time} - (86400 * 3)
                    AND d.interval = '1d'::interval
                    GROUP BY d.book_config

                ), week_data AS (
                    SELECT
                        book_config,
                        SUM(d.open) AS "open",
                        SUM(d.high) AS "high",
                        SUM(d.low) AS "low",
                        SUM(d.close) AS "close",
                        SUM(d.volume) AS "volume",
                        SUM(d.turnover) AS "turnover"

                    FROM bars AS d
                    WHERE {time} % (86400 * 7) = 0
                    AND d.timestamp >= {time} - (86400 * 7)
                    AND d.interval = '1d'::interval
                    GROUP BY d.book_config

                ), week_2_data AS (
                    SELECT
                        book_config,
                        SUM(w.open) AS "open",
                        SUM(w.high) AS "high",
                        SUM(w.low) AS "low",
                        SUM(w.close) AS "close",
                        SUM(w.volume) AS "volume",
                        SUM(w.turnover) AS "turnover"

                    FROM bars AS w
                    WHERE ({time} - ({time} / (86400 * 7 * 4) * (86400 * 7 * 4))) % ((86400 * 7) * 2) = 0
                    AND w.timestamp >= {time} - ((86400 * 7) * 2)
                    AND w.interval = '1d'::interval
                    GROUP BY w.book_config

                ), week_3_data AS (
                    SELECT
                        book_config,
                        SUM(w.open) AS "open",
                        SUM(w.high) AS "high",
                        SUM(w.low) AS "low",
                        SUM(w.close) AS "close",
                        SUM(w.volume) AS "volume",
                        SUM(w.turnover) AS "turnover"

                    FROM bars AS w
                    WHERE ({time} - ({time} / (86400 * 7 * 4) * (86400 * 7 * 4))) % ((86400 * 7) * 3) = 0
                    AND w.timestamp >= {time} - ((86400 * 7) * 3)
                    AND w.interval = '1d'::interval
                    GROUP BY w.book_config

                ), market_data AS (
                    SELECT 
                        *, 
                        '1m'::interval AS "interval",
                        {time} AS "timestamp" 
                    FROM minute_data
                    UNION
                    SELECT 
                        *, 
                        '2m'::interval AS "interval",
                        {time} AS "timestamp" 
                    FROM minute_2_data
                    UNION
                    SELECT 
                        *, 
                        '3m'::interval AS "interval",
                        {time} AS "timestamp" 
                    FROM minute_3_data
                    UNION
                    SELECT 
                        *, 
                        '4m'::interval AS "interval",
                        {time} AS "timestamp" 
                    FROM minute_4_data
                    UNION
                    SELECT 
                        *, 
                        '5m'::interval AS "interval",
                        {time} AS "timestamp" 
                    FROM minute_5_data
                    UNION
                    SELECT 
                        *, 
                        '10m'::interval AS "interval",
                        {time} AS "timestamp" 
                    FROM minute_10_data
                    UNION
                    SELECT 
                        *, 
                        '15m'::interval AS "interval",
                        {time} AS "timestamp" 
                    FROM minute_15_data
                    UNION
                    SELECT 
                        *, 
                        '20m'::interval AS "interval",
                        {time} AS "timestamp" 
                    FROM minute_20_data
                    UNION
                    SELECT 
                        *, 
                        '30m'::interval AS "interval",
                        {time} AS "timestamp" 
                    FROM minute_30_data
                    UNION
                    SELECT 
                        *, 
                        '1h'::interval AS "interval",
                        {time} AS "timestamp" 
                    FROM hour_data
                    UNION
                    SELECT 
                        *, 
                        '2h'::interval AS "interval",
                        {time} AS "timestamp" 
                    FROM hour_2_data
                    UNION
                    SELECT 
                        *, 
                        '3h'::interval AS "interval",
                        {time} AS "timestamp" 
                    FROM hour_3_data
                    UNION
                    SELECT 
                        *, 
                        '4h'::interval AS "interval",
                        {time} AS "timestamp" 
                    FROM hour_4_data
                    UNION
                    SELECT 
                        *, 
                        '6h'::interval AS "interval",
                        {time} AS "timestamp" 
                    FROM hour_6_data
                    UNION
                    SELECT 
                        *, 
                        '8h'::interval AS "interval",
                        {time} AS "timestamp" 
                    FROM hour_8_data
                    UNION
                    SELECT 
                        *, 
                        '12h'::interval AS "interval",
                        {time} AS "timestamp" 
                    FROM hour_12_data
                    UNION
                    SELECT 
                        *, 
                        '1D'::interval AS "interval",
                        {time} AS "timestamp" 
                    FROM day_data
                    UNION
                    SELECT 
                        *, 
                        '2D'::interval AS "interval",
                        {time} AS "timestamp" 
                    FROM day_2_data
                    UNION
                    SELECT 
                        *, 
                        '3D'::interval AS "interval",
                        {time} AS "timestamp" 
                    FROM day_3_data
                    UNION
                    SELECT 
                        *, 
                        '1W'::interval AS "interval",
                        {time} AS "timestamp" 
                    FROM week_data
                    UNION
                    SELECT 
                        *, 
                        '2W'::interval AS "interval",
                        {time} AS "timestamp" 
                    FROM week_2_data
                    UNION
                    SELECT 
                        *, 
                        '3W'::interval AS "interval",
                        {time} AS "timestamp" 
                    FROM week_3_data
                    -- M, 2M, 3M, 4M, 6M, 12M | 1Y, are a bit complex to create, will do later
                    -- not important to do for MVP

                )

                INSERT INTO market_order_history (
                    "book_config",
                    "interval",
                    "open",
                    "high",
                    "low",
                    "close",
                    "volume",
                    "turnover",
                    "timestamp"
                )
                SELECT 
                    m.book_config,
                    m.interval,
                    m.open,
                    m.high,
                    m.low,
                    m.close,
                    m.volume,
                    m.turnover,
                    m.timestamp

                FROM market_data AS m;


                WITH pre_candle AS (
                    SELECT
                        m.book_config,
                        m.close,
                        m.volume,
                        m.turnover,
                        m.timestamp

                    FROM market_order_history AS m
                    WHERE m.interval = '1m'::interval 
                    AND (m.timestamp = {time} OR m.timestamp = ({time} - 86400)) 

                ), candle AS (


                    -- current
                    -- fall back if no rows exist,
                    -- but shouldn't be the case since inserts take place right before
                    SELECT 
                        c.pubkey_id AS book_config,
                        0 AS "close",
                        0 AS "volume",
                        0 AS "turnover",
                        {time} AS "timestamp"

                    FROM order_book_config AS c
                    LEFT JOIN pre_candle AS t ON t.book_config = c.pubkey_id
                    AND t.timestamp = {time}
                    WHERE t.book_config IS NULL

                    UNION 

                    -- day offset
                    -- fall back if no rows exist,
                    -- when there is no data then this should take place
                    -- necessary for initial 24 hours
                    SELECT 
                        c.pubkey_id AS book_config,
                        0 AS "close",
                        0 AS "volume",
                        0 AS "turnover",
                        ({time} - 86400) AS "timestamp"

                    FROM order_book_config AS c
                    LEFT JOIN pre_candle AS t ON t.book_config = c.pubkey_id
                    AND t.timestamp = ({time} - 86400) 
                    WHERE t.book_config IS NULL

                    UNION
                    SELECT * FROM pre_candle

                ), pre_trade_data AS (
                    SELECT
                        td.book_config,
                        td.last_price,
                        "24_hour_volume",
                        "24_hour_turnover"

                    FROM trade_data_24_hour AS td
                    WHERE td.timestamp = ({time} - 60)

                ), trade_data AS (
                    SELECT 
                        c.pubkey_id AS book_config,
                        (
                            SELECT 
                                last_price 
                            FROM candle AS c 
                            WHERE c.timestamp = ({time} - 60) 
                        ) AS last_price,
                        SUM(m.volume) AS "24_hour_volume",
                        SUM(m.turnover) AS "24_hour_turnover"

                    FROM order_book_config AS c
                    LEFT JOIN pre_trade_data AS t ON t.book_config = c.pubkey_id
                    JOIN market_order_history AS m ON m.book_config = c.pubkey_id
                    WHERE t.book_config IS NULL 
                    AND m.timestamp >= ({time} - 86400) 
                    AND m.timestamp <= {time}
                    GROUP BY GROUPING SETS (
                        (1, 2)
                    )

                    UNION
                    SELECT * FROM pre_trade_data

                )

                INSERT INTO trade_data_24_hour
                SELECT 
                    td.book_config,
                    a.close AS last_price,
                    "24_hour_volume" + a.volume - r.volume AS volume,
                    "24_hour_turnover" + a.turnover - r.turnover AS turnover,
                    -- im worried about interger overflow
                    -- maybe this should be handled on client?
                    -- (td.last_price - a.close) * 10000 / td.last_price AS "24_hour_change",
                    CASE WHEN td.last_price IS NOT NULL
                        THEN (td.last_price - a.close)
                        ELSE 0
                    END AS "24_hour_price_change",
                    -- apply to "24_hour_price_change" to get 24h % change
                    CASE WHEN td.last_price IS NOT NULL
                        THEN td.last_price
                        ELSE 0
                    END AS "24_hour_prev_last_price",
                    a.timestamp AS "timestamp"

                FROM trade_data AS td
                JOIN candle AS a ON a.book_config = td.book_config
                JOIN candle AS r ON r.book_config = td.book_config
                WHERE r.timestamp = ({time} - 86400) AND a.timestamp = {time};

                COMMIT;
            "#)
    )
    .execute(pool)
    .await
    .unwrap();
}

pub async fn get_trade_pair(
    pubkey_id: &Pubkey,
    app_state: web::Data<AppState>,
) -> Result<Box<Value>, sqlx::Error> {
    let query = sqlx::query(
        r#"
                WITH trade_pair AS (
                    SELECT * FROM order_book_config AS obc
                    WHERE obc.pubkey_id = $1

                ), position AS (
                    SELECT
                        op.pubkey_id AS "pubkey_id", 
                        opc.pubkey_id AS "position_config", 
                        op.next_position AS "next_position", 
                        opc.market_maker AS "market_maker", 
                        op.order_type AS "order_type", 
                        op.price AS "price", 
                        op.size AS "size", 
                        op.is_available AS  "is_available",

                        CASE
                            WHEN (NOT t.is_reverse AND op.order_type = 'bid')
                                OR (t.is_reverse AND op.order_type = 'ask')
                                THEN opc.capital_a
                            WHEN (NOT t.is_reverse AND op.order_type = 'ask')
                                OR (t.is_reverse AND op.order_type = 'bid')
                                THEN opc.capital_b
                        END AS "capital_source",
                        
                        CASE
                            WHEN (NOT t.is_reverse AND op.order_type = 'bid')
                                OR (t.is_reverse AND op.order_type = 'ask')
                                THEN opc.capital_b
                            WHEN (NOT t.is_reverse AND op.order_type = 'ask')
                                OR (t.is_reverse AND op.order_type = 'bid')
                                THEN opc.capital_a
                        END AS "capital_destination",
                        
                        CASE
                            WHEN (NOT t.is_reverse AND op.order_type = 'bid')
                                OR (t.is_reverse AND op.order_type = 'ask')
                                THEN opc.vault_a
                            WHEN (NOT t.is_reverse AND op.order_type = 'ask')
                                OR (t.is_reverse AND op.order_type = 'bid')
                                THEN opc.vault_b
                        END AS "source",
                        
                        CASE
                            WHEN (NOT t.is_reverse AND op.order_type = 'bid')
                                OR (t.is_reverse AND op.order_type = 'ask')
                                THEN opc.vault_b
                            WHEN (NOT t.is_reverse AND op.order_type = 'ask')
                                OR (t.is_reverse AND op.order_type = 'bid')
                                THEN opc.vault_a
                        END AS "destination",

                        op.slot AS "slot", 
                        op.timestamp AS "timestamp"

                    FROM order_position_config AS opc
                    JOIN order_position AS op ON op.position_config = opc.pubkey_id
                    JOIN trade_pair AS t ON t.pubkey_id = opc.book_config

                ), bids AS (
                    SELECT
                        p.pubkey_id,
                        p.position_config,
                        p.next_position,
                        p.market_maker,
                        p.order_type,
                        p.price,
                        p.size,
                        p.is_available,
                        p.capital_source,
                        p.capital_destination,
                        p.source,
                        p.destination,
                        p.slot,
                        p.timestamp

                    FROM position AS p
                    WHERE p.order_type = 'bid'
                    ORDER BY p.price DESC, p.slot ASC

                ), asks AS (
                    SELECT
                        p.pubkey_id,
                        p.position_config,
                        p.next_position,
                        p.market_maker,
                        p.order_type,
                        p.price,
                        p.size,
                        p.is_available,
                        p.capital_source,
                        p.capital_destination,
                        p.source,
                        p.destination,
                        p.slot,
                        p.timestamp

                    FROM position AS p
                    WHERE p.order_type = 'ask'
                    ORDER BY p.price ASC, p.slot ASC

                ), agg_bids AS (
                    SELECT 
                        $1 AS "pubkey_id",
                        array_agg(
                            json_build_object(
                                'pubkeyId', b.pubkey_id,
                                'positionConfig', b.position_config,
                                'nextPosition', b.next_position,
                                'marketMaker', b.market_maker,
                                'orderType', b.order_type,
                                'price', b.price,
                                'size', b.size,
                                'isAvailable', b.is_available,
                                'sourceCapital', b.capital_source,
                                'destinationCapital', b.capital_destination,
                                'sourceVault', b.source,
                                'destinationVault', b.destination,
                                'slot', b.slot,
                                'timestamp', b.timestamp
                            )
                        ) AS bids
                    FROM bids AS b

                ), agg_asks AS (
                    SELECT 
                        $1 AS "pubkey_id",
                        array_agg(
                            json_build_object(
                                'pubkeyId', a.pubkey_id,
                                'positionConfig', a.position_config,
                                'nextPosition', a.next_position,
                                'marketMaker', a.market_maker,
                                'orderType', a.order_type,
                                'price', a.price,
                                'size', a.size,
                                'isAvailable', a.is_available,
                                'sourceCapital', a.capital_source,
                                'destinationCapital', a.capital_destination,
                                'sourceVault', a.source,
                                'destinationVault', a.destination,
                                'slot', a.slot,
                                'timestamp', a.timestamp
                            )
                        ) AS asks
                    FROM asks AS a

                )

                SELECT
                    json_build_object(
                        'pubkeyId', t.pubkey_id,
                        'tokenMintA', t.token_mint_a,
                        'tokenMintB', t.token_mint_b,
                        'tokenProgramA', t.token_program_a,
                        'tokenProgramB', t.token_program_b,
                        'sellMarketPointer', t.sell_market,
                        'buyMarketPointer', t.buy_market,
                        'tokenDecimalsA', t.token_decimals_a,
                        'tokenDecimalsB', t.token_decimals_b,
                        'tokenSymbolA', t.token_symbol_a,
                        'tokenSymbolB', t.token_symbol_b,
                        'isReverse', t.is_reverse,
                        'book', json_build_object(
                            'asks', book_asks.asks,
                            'bids', book_bids.bids
                        )
                    )

                FROM trade_pair AS t
                FULL JOIN agg_asks AS book_asks ON book_asks.pubkey_id = t.pubkey_id
                FULL JOIN agg_bids AS book_bids ON book_bids.pubkey_id = t.pubkey_id;
        "#,
    )
    .bind(&pubkey_id.to_string())
    .fetch_one(&app_state.pool)
    .await?;

    let mut data: Box<Value> = serde_json::from_str(
        query
            .try_get_raw("json_build_object")
            .unwrap()
            .as_str()
            .unwrap(),
    )
    .unwrap();

    if data["book"]["bids"] == Value::Null {
        data["book"]["bids"] = Value::Array(vec![]);
    }

    if data["book"]["asks"] == Value::Null {
        data["book"]["asks"] = Value::Array(vec![]);
    }

    Ok(data)
}

pub async fn get_trade_pair_list(
    limit: u64,
    offset: u64,
    app_state: web::Data<AppState>,
) -> Result<Box<Value>, sqlx::Error> {
    let dt: DateTime<Utc> = Utc::now();
    let delta = dt.timestamp() % 60;
    let time = if delta < 6 {
        dt.timestamp() / 60 * 60 - 60
    } else {
        dt.timestamp() / 60 * 60
    };

    let query = sqlx::query(
        r#"
                WITH config AS (
                    SELECT * FROM order_book_config
                    LIMIT $1
                    OFFSET $2
                    
                ), market_data AS (
                    SELECT * FROM trade_data_24_hour as td
                    WHERE td.timestamp = $3

                )

                SELECT
                    json_agg(
                        json_build_object(
                            'pubkeyId', "pubkey_id",
                            'tokenMintA', "token_mint_a", 
                            'tokenMintB', "token_mint_b", 
                            'tokenProgramA', "token_program_a", 
                            'tokenProgramB', "token_program_b", 
                            'sellMarketPointer', "sell_market", 
                            'buyMarketPointer', "buy_market",
                            'tokenDecimalsA', "token_decimals_a",
                            'tokenDecimalsB', "token_decimals_b",
                            'tokenSymbolA', "token_symbol_a",
                            'tokenSymbolB', "token_symbol_b",
                            'ticker', "ticker",
                            'isReversal', "is_reverse",

                            'marketData', json_build_object(
                                'lastPrice',
                                    CASE WHEN m.last_price IS NOT NULL
                                        THEN m.last_price
                                        ELSE 0
                                    END,
                                '24hVolume',
                                    CASE WHEN "24_hour_volume" IS NOT NULL
                                        THEN "24_hour_volume"
                                        ELSE 0
                                    END,
                                '24hTurnover',
                                    CASE WHEN "24_hour_turnover" IS NOT NULL
                                        THEN "24_hour_turnover"
                                        ELSE 0
                                    END,
                                '24hPriceChange',
                                    CASE WHEN "24_hour_price_change" IS NOT NULL
                                        THEN "24_hour_price_change"
                                        ELSE 0
                                    END,
                                '24hPrevLastPrice',
                                    CASE WHEN "24_hour_prev_last_price" IS NOT NULL
                                        THEN "24_hour_prev_last_price"
                                        ELSE 0
                                    END,
                                'timestamp', 
                                    CASE WHEN m.timestamp IS NOT NULL
                                        THEN m.timestamp
                                        ELSE $3
                                    END
                            )
                        )
                    )

                From config
                LEFT JOIN market_data AS m ON m.book_config = config.pubkey_id;
        "#,
    )
    .bind(limit as i64)
    .bind(offset as i64)
    .bind(time as i64)
    .fetch_one(&app_state.pool)
    .await?;

    let data: Box<Value> = serde_json::from_str(
        query
            .try_get_raw("json_build_object")
            .unwrap()
            .as_str()
            .unwrap(),
    )
    .unwrap();

    Ok(data)
}

// need handle has optional
pub async fn get_market_order_history(
    pubkey_id: Pubkey,
    // interval: PgInterval,
    interval: String,
    limit: u64,
    offset: u64,
    app_state: web::Data<AppState>,
) -> Result<Box<Value>, sqlx::Error> {
    let query = sqlx::query(
        r#"
                -- can't do this like this
                -- SET intervalstyle = iso_8601;

                WITH market AS (
                    SELECT * FROM market_order_history AS m 
                    WHERE m.book_config = $1
                    AND m.interval = $2::interval
                    ORDER BY m.timestamp DESC
                    LIMIT $3
                    OFFSET $4;
                ), p AS (
                    SELECT 
                        DISTINCT m.book_config AS book_config,
                        CASE
                            WHERE p.interval = 'T1m'::interval THEN '1m'::TEXT,
                            WHERE p.interval = 'T2m'::interval THEN '2m'::TEXT,
                            WHERE p.interval = 'T5m'::interval THEN '5m'::TEXT,
                            WHERE p.interval = 'T10m'::interval THEN '10m'::TEXT,
                            WHERE p.interval = 'T15m'::interval THEN '15m'::TEXT,
                            WHERE p.interval = 'T20m'::interval THEN '20m'::TEXT,
                            WHERE p.interval = 'T30m'::interval THEN '30m'::TEXT,
                            WHERE p.interval = 'T1h'::interval THEN '1h'::TEXT,
                            WHERE p.interval = 'T2h'::interval THEN '2h'::TEXT,
                            WHERE p.interval = 'T3h'::interval THEN '3h'::TEXT,
                            WHERE p.interval = 'T4h'::interval THEN '4h'::TEXT,
                            WHERE p.interval = 'T6h'::interval THEN '6h'::TEXT,
                            WHERE p.interval = 'T8h'::interval THEN '8h'::TEXT,
                            WHERE p.interval = 'T12h'::interval THEN '12h'::TEXT,
                            WHERE p.interval = 'PD'::interval THEN 'D'::TEXT,
                            WHERE p.interval = 'P2D'::interval THEN '2D'::TEXT,
                            WHERE p.interval = 'P3D'::interval THEN '3D'::TEXT,
                            WHERE p.interval = 'PW'::interval THEN 'W'::TEXT,
                            WHERE p.interval = 'P2W'::interval THEN '2W'::TEXT,
                            WHERE p.interval = 'P3W'::interval THEN '3W'::TEXT,
                            WHERE p.interval = 'P1M'::interval THEN '1M'::TEXT,
                            WHERE p.interval = 'P2M'::interval THEN '2M'::TEXT,
                            WHERE p.interval = 'P3M'::interval THEN '3M'::TEXT,
                            WHERE p.interval = 'P4M'::interval THEN '4M'::TEXT,
                            WHERE p.interval = 'P6M'::interval THEN '6M'::TEXT,
                            WHERE p.interval = 'P12M'::interval THEN '12M'::TEXT,
                        END AS interval

                    FROM market_order_history AS m 
                    WHERE m.book_config = $1
                    AND m.interval = '$2::interval
                    
                )

                SELECT 
                    json_build_object(
                        'orderBookConfig', p.book_config,
                        'interval', p.interval,
                        'market', json_agg(
                            json_build_object(
                                -- 'id', m.id,
                                'open', m.open,
                                'high', m.high,
                                'low', m.low,
                                'close', m.close,
                                'volume', m.volume,
                                'turnover', m.turnover,
                                'timestamp', m.timestamp
                            )
                        )
                    )

                FROM market AS m
                JOIN p ON p.book_config = m.book_config;
            "#,
    )
    .bind(pubkey_id.to_string())
    .bind(interval)
    .bind(limit as i64)
    .bind(offset as i64)
    .fetch_one(&app_state.pool)
    .await?;

    let data: Box<Value> = serde_json::from_str(
        query
            .try_get_raw("json_build_object")
            .unwrap()
            .as_str()
            .unwrap(),
    )
    .unwrap();

    Ok(data)
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

// handled by a scheduler
pub async fn delete_real_trade(pool: &Pool<Postgres>) {
    let dt: DateTime<Utc> = Utc::now();
    let timestamp = dt.timestamp() / 60 * 60;

    sqlx::raw_sql(&format!(
        r#"
            DELETE FROM real_time_trade_data  AS td
            WHERE {} - td.timestamp >= 86400;
        "#,
        timestamp
    ))
    // .bind(timestamp)
    // .persistent(false)
    .execute(pool)
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

// -> Result<Vec<TradePair>, sqlx::Error>
// pub async fn open_limit_order(
//     pubkey_id: String,
//     order_type: String,
//     price: u64,
//     app_state: AppState,
// ) {
//     let query = sqlx::query(
//         r#"
//                 WITH trade_pair AS (
//                     SELECT * FROM order_book_config AS obc
//                     WHERE obc.pubkey_id = $1

//                 ), ledger AS (
//                     SELECT
//                         op.pubkey_id AS "pubkey_id",
//                         opc.pubkey_id AS "order_pos_config",
//                         op.next_order_position_pubkey AS "next_order_pos",
//                         opc.market_maker_pubkey AS "market_maker_pubkey",
//                         op.order_type AS "order_type",
//                         op.price AS "price",
//                         op.size AS "size",
//                         op.is_available AS  "is_available",

//                         CASE
//                             WHEN (NOT s.is_reverse AND op.order_type = 'bid')
//                                 OR (s.is_reverse AND op.order_type = 'ask')
//                                 THEN opc.vault_a_pubkey
//                             WHEN (NOT s.is_reverse AND op.order_type = 'ask')
//                                 OR (s.is_reverse AND op.order_type = 'bid')
//                                 THEN opc.vault_b_pubkey
//                         END AS "source",

//                         CASE
//                             WHEN (NOT s.is_reverse AND op.order_type = 'bid')
//                                 OR (s.is_reverse AND op.order_type = 'ask')
//                                 THEN opc.vault_b_pubkey
//                             WHEN (NOT s.is_reverse AND op.order_type = 'ask')
//                                 OR (s.is_reverse AND op.order_type = 'bid')
//                                 THEN opc.vault_a_pubkey
//                         END AS "destination",

//                         op.slot AS "slot",
//                         op.timestamp AS "timestamp"

//                     FROM order_position_config AS opc
//                     JOIN order_position AS op ON op.order_position_config_pubkey = opc.pubkey_id
//                     JOIN trade_pair ON trade_pair.pubkey_id = opc.order_book_config_pubkey
//                     WHERE opc.order_book_config_pubkey = $1 AND op.order_type = $2
//                     ORDER BY op.price ASC

//                 ), min_price AS (
//                     SELECT
//                         ledger.pubkey_id AS pubkey_id,
//                         MIN(ledger.price) as price
//                     FROM ledger
//                     WHERE ledger.price >= $3
//                     GROUP BY ledger.pubkey_id

//                 ) max_price AS (
//                     SELECT
//                         ledger.pubkey_id AS pubkey_id,
//                         MAX(ledger.price) AS price
//                     FROM ledger
//                     WHERE ledger.price <= $3
//                     GROUP BY ledger.pubkey_id

//                 ), chained AS (
//                     SELECT
//                         CASE
//                             WHEN t.order_type = 'bid'
//                                 THEN max_price.pubkey_id
//                             WHEN t.order_type = 'ask'
//                                 THEN min_price.pubkey_id
//                         END AS prev_pubkey_id,

//                         CASE
//                             WHEN t.order_type = 'bid'
//                                 THEN min_price.pubkey_id
//                             WHEN t.order_type = 'ask'
//                                 THEN max_price.pubkey_id
//                         END AS next_pubkey_id

//                     FROM min_price
//                     LEFT JOIN max_price

//                 ), reduced_ledger AS (
//                     SELECT
//                         *
//                     FROM t
//                     JOIN min_price ON min_price.price = t.price
//                     JOIN max_price ON max_price.price = t.price

//                 )

//                 SELECT
//                     *
//                 FROM reduced_ledger
//                 JOIN chained ON reduced_ledger.pubkey_id = chained.prev_pubkey_id
//                 WHERE reduced_ledger.next_order_pos = chained.next_pubkey_id;
//         "#,
//     )
//     .bind(&pubkey_id)
//     .bind(&order_type)
//     .bind(&price.to_string())
//     .fetch_one(&app_state.pool)
//     .await?;
// }
