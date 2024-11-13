// TODO! NEED CONVERT NUMBER TO TEXT WHERE EVER I CAN AND MAKES SENSE
use {
    crate::AppState,
    actix_web::web,
    chrono::prelude::*,
    order_book_dex::state::Order,
    serde::{Deserialize, Serialize},
    serde_json::{json, value::Value, Number},
    solana_sdk::pubkey::Pubkey,
    sqlx::{prelude::FromRow, Pool, Postgres, Row, ValueRef},
    std::str::FromStr,
};

pub struct OpenLimitOrder {
    pub _book_config: Pubkey,
    pub market_pointer: (Pubkey, bool),
    pub contra_pointer: Pubkey,
    pub token_mint_a: Pubkey,
    pub token_mint_b: Pubkey,
    pub token_program_a: Pubkey,
    pub token_program_b: Pubkey,
    pub position_config: Option<Pubkey>,
    pub _market_maker: Option<Pubkey>,
    pub _capital_a: Option<Pubkey>,
    pub _capital_b: Option<Pubkey>,
    pub _vault_a: Option<Pubkey>,
    pub _vault_b: Option<Pubkey>,
    pub prev_position: Option<Pubkey>,
    pub next_position: Option<Pubkey>,
    pub _order_type: Order,
    pub _nonce: Option<u64>,
    pub _reference: Option<u64>,
    pub is_reverse: bool,
}

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
    // need to use enum Order but need to impl Deserialize trait
    pub order_type: String,
    pub price: u64,
    pub size: u64,
    pub is_available: bool,
    pub parent_position: Option<Pubkey>,
    pub next_position: Option<Pubkey>,
    pub position_config: Pubkey,
    pub book_config: Pubkey,
    pub source_vault: Pubkey,
    pub destination_vault: Pubkey,
    pub slot: u64,
    pub timestamp: u64,
    pub is_head: bool,
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

pub async fn insert_trade_pair(trade_pair: TradePair, app_state: &AppState) {
    match sqlx::raw_sql(&format!(
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
                ) VALUES ('{}', '{}', '{}', '{}', '{}', '{}', '{}', {}, {}, '{}', '{}', '{}', {}::BOOLEAN);
            "#,
        trade_pair.pubkey_id.to_string(),
        trade_pair.token_mint_a.to_string(),
        trade_pair.token_mint_b.to_string(),
        trade_pair.token_program_a.to_string(),
        trade_pair.token_program_b.to_string(),
        trade_pair.sell_market.to_string(),
        trade_pair.buy_market.to_string(),
        trade_pair.token_decimals_a as i16,
        trade_pair.token_decimals_b as i16,
        trade_pair.token_symbol_a,
        trade_pair.token_symbol_b,
        trade_pair.ticker,
        trade_pair.is_reverse.to_string(),
    ))
    .execute(&app_state.pool)
    .await {
        Ok(_) => println!("INSERT TRADE PAIR SUCCESS"),
        Err(_) => println!("INSERT TRADE PAIR FAIL"),
    };
}

pub async fn insert_order_position_config(position_config: PositionConfig, app_state: &AppState) {
    match sqlx::raw_sql(&format!(
        r#"
                INSERT INTO order_position_config (
                    "pubkey_id",
                    "book_config",
                    "market_maker",
                    "capital_a",
                    "capital_b",
                    "vault_a",
                    "vault_b",
                    "nonce",
                    "reference"
                ) VALUES ('{}', '{}', '{}', '{}', '{}', '{}', '{}', 0, 0);
            "#,
        position_config.pubkey_id.to_string(),
        position_config.book_config.to_string(),
        position_config.market_maker.to_string(),
        position_config.capital_a.to_string(),
        position_config.capital_b.to_string(),
        position_config.vault_a.to_string(),
        position_config.vault_b.to_string(),
    ))
    .execute(&app_state.pool)
    .await
    {
        Ok(success) => println!("INSERT ORDER POSITION CONFIG SUCCESS :: {:?}", success),
        Err(error) => println!("INSERT ORDER POSITION CONFIG FAIL :: {}", error),
    };
}

// issue with prepared statement
pub async fn insert_order_position(order_position: OrderPosition, app_state: &AppState) {
    match sqlx::raw_sql(&format!(
        r#"
                WITH head_change AS (
                    UPDATE order_position AS p
                    SET is_head = false
                    WHERE 
                    (({is_head}::BOOLEAN IS TRUE AND p.is_head IS TRUE)
                    OR
                    ({is_head}::BOOLEAN IS FALSE AND p.is_head IS NULL))
                    AND 
                    p.order_type = '{order_type}'::order_type

                ), parent AS (
                    UPDATE order_position AS p
                    SET next_position = '{next_position}'
                    WHERE p.pubkey_id = '{parent_id}' -- parent position 
                    AND p.pubkey_id IS NOT NULL 

                )

                INSERT INTO order_position (
                    "pubkey_id",
                    "book_config",
                    "position_config",
                    "next_position",
                    "source_vault",
                    "destination_vault",
                    "order_type",
                    "price",
                    "size",
                    "is_available",
                    "slot",
                    "timestamp",
                    "is_head"

                ) VALUES (
                    '{pubkey_id}', 
                    '{book_config}', 
                    '{position_config}', 
                    '{next_position}', 
                    '{source_vault}', 
                    '{destination_vault}', 
                    '{order_type}'::order_type, 
                    {price}, 
                    {size}, 
                    {is_available}, 
                    {slot}, 
                    {timestamp}, 
                    {is_head}
                 );
            "#,
        parent_id = order_position
            .parent_position
            .map_or(String::from(""), |v| v.to_string()),
        pubkey_id = order_position.pubkey_id.to_string(),
        book_config = order_position.book_config.to_string(),
        position_config = order_position.position_config.to_string(),
        next_position = order_position
            .next_position
            .map_or(String::from(""), |v| v.to_string()),
        source_vault = order_position.source_vault.to_string(),
        destination_vault = order_position.destination_vault.to_string(),
        order_type = order_position.order_type.to_string(),
        price = order_position.price.to_string(),
        size = order_position.size.to_string(),
        is_available = order_position.is_available,
        slot = order_position.slot.to_string(),
        timestamp = order_position.timestamp.to_string(),
        is_head = order_position.is_head,
    ))
    .execute(&app_state.pool)
    .await
    {
        Ok(success) => println!("INSERT ORDER POSITION SUCCESS :: {:?}", success),
        Err(error) => println!("INSERT ORDER POSITION FAIL :: {}", error),
    };
}

pub async fn insert_real_time_trade(trade: RealTimeTrade, app_state: &AppState) {
    match sqlx::raw_sql(&format!(
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
        ) VALUES ('{}', '{}', '{}', '{}', '{}', '{}', '{}', '{}');
    "#,
        trade.book_config,
        trade.order_type,
        trade.last_price.to_string(),
        trade.avg_price.to_string(),
        trade.amount.to_string(),
        trade.turnover.to_string(),
        trade.timestamp.to_string(),
        trade.slot.to_string()
    ))
    .execute(&app_state.pool)
    .await
    {
        Ok(success) => println!("INSERT REAL TIME TRADE SUCCESS :: {:?}", success),
        Err(error) => println!("INSERT REAL TIME TRADE FAIL :: {}", error),
    };
}

// handled by a scheduler
pub async fn insert_market_order_history(pool: &Pool<Postgres>) {
    let dt: DateTime<Utc> = Utc::now();
    let time = dt.timestamp() / 60 * 60;

    match sqlx::raw_sql(
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
    .await {
        Ok(data) => println!("INSERT RESULT MARKET HISTORY {:?}", data),
        Err(error) => println!("INSERT MARKET HISTORY ERROR: {}", error),
    }
}

pub async fn get_trade_pair(
    pubkey_id: &Pubkey,
    position_config: &Option<Pubkey>,
    app_state: web::Data<AppState>,
) -> Result<Box<Value>, sqlx::Error> {
    let query = sqlx::raw_sql(&format!(
        r#"
                WITH input AS (
                    SELECT * FROM (
                    VALUES  (
                        '{}',
                        '{}'
                    )) AS t ("book_config", "position_config")
                ), trade_pair AS (
                    SELECT * FROM order_book_config AS obc
                    WHERE obc.pubkey_id = (SELECT book_config FROM input)

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
                        (SELECT book_config FROM input) AS "pubkey_id",
                        array_agg(
                            json_build_object(
                                'pubkeyId', b.pubkey_id,
                                'positionConfig', b.position_config,
                                'nextPosition', b.next_position,
                                'marketMaker', b.market_maker,
                                'orderType', b.order_type,
                                'price', b.price::TEXT,
                                'size', b.size::TEXT,
                                'isAvailable', b.is_available,
                                'sourceCapital', b.capital_source,
                                'destinationCapital', b.capital_destination,
                                'sourceVault', b.source,
                                'destinationVault', b.destination,
                                'slot', b.slot::TEXT,
                                'timestamp', b.timestamp::TEXT
                            )
                        ) AS bids
                    FROM bids AS b

                ), agg_asks AS (
                    SELECT 
                       (SELECT book_config FROM input) AS "pubkey_id",
                        array_agg(
                            json_build_object(
                                'pubkeyId', a.pubkey_id,
                                'positionConfig', a.position_config,
                                'nextPosition', a.next_position,
                                'marketMaker', a.market_maker,
                                'orderType', a.order_type,
                                'price', a.price::TEXT,
                                'size', a.size::TEXT,
                                'isAvailable', a.is_available,
                                'sourceCapital', a.capital_source,
                                'destinationCapital', a.capital_destination,
                                'sourceVault', a.source,
                                'destinationVault', a.destination,
                                'slot', a.slot::TEXT,
                                'timestamp', a.timestamp::TEXT
                            )
                        ) AS asks
                    FROM asks AS a

                ), trade_history AS (
                    SELECT 
                        order_type,
                        last_price,
                        amount,
                        "timestamp"
                        
                    FROM real_time_trade_data
                    WHERE book_config = (SELECT book_config FROM input)
                    ORDER BY slot DESC
                    LIMIT 200

                ), trade_history_agg AS (
                    SELECT
                        (SELECT book_config FROM input) AS book_config,
                        json_agg(
                            json_build_object(
                                'action', h.order_type,
                                'price', h.last_price::TEXT,
                                'qty', h.amount::TEXT,
                                'time', h.timestamp
                            )
                        ) as trades
                    FROM trade_history AS h
                    GROUP BY book_config

                ), market_data AS (
                    SELECT
                        (SELECT book_config FROM input) AS book_config,
                        CASE WHEN t.last_price IS NOT NULL 
                            THEN t.last_price
                            ELSE 0 
                        END AS last_price,

                        CASE WHEN "24_hour_volume" IS NOT NULL 
                            THEN "24_hour_volume"
                            ELSE 0 
                        END AS volume,

                        CASE WHEN "24_hour_turnover" IS NOT NULL 
                            THEN "24_hour_turnover"
                            ELSE 0 
                        END AS turnover,

                        CASE WHEN "24_hour_price_change" IS NOT NULL 
                            THEN "24_hour_price_change"
                            ELSE 0 
                        END AS change_delta,

                        CASE WHEN "24_hour_prev_last_price" IS NOT NULL 
                            THEN "24_hour_prev_last_price"
                            ELSE 0 
                        END AS prev_last_price,

                        CASE WHEN t.timestamp IS NOT NULL 
                            THEN t.timestamp
                            ELSE 0 
                        END AS "timestamp"

                    FROM trade_data_24_hour AS t 
                    WHERE book_config = (SELECT book_config FROM input)
                    ORDER BY t.timestamp DESC 
                    LIMIT 1
                    
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
                        'ticker', t.ticker,
                        
                        'positionConfig', (
                            SELECT pubkey_id
                            FROM order_position_config
                            WHERE pubkey_id = (SELECT position_config FROM input)
                        ),

                        'book', json_build_object(
                            'asks', book_asks.asks,
                            'bids', book_bids.bids
                        ),

                        'trades', h.trades,

                        'marketData', json_build_object(
                            'lastPrice', md.last_price::TEXT,
                            'volume', md.volume::TEXT,
                            'turnover', md.turnover::TEXT,
                            'changeDelta', md.change_delta::TEXT,
                            'prevLastPrice', md.prev_last_price::TEXT,
                            'time', md.timestamp::TEXT
                        )
                    )

                FROM trade_pair AS t
                FULL JOIN trade_history_agg AS h ON h.book_config = t.pubkey_id
                FULL JOIN market_data AS md ON md.book_config = t.pubkey_id
                FULL JOIN agg_asks AS book_asks ON book_asks.pubkey_id = t.pubkey_id
                FULL JOIN agg_bids AS book_bids ON book_bids.pubkey_id = t.pubkey_id;
        "#,
        pubkey_id.to_string(),
        position_config.map_or(String::from(""), |v| v.to_string())
    ))
    .fetch_one(&app_state.pool)
    // need to handle this
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

    if data["trades"] == Value::Null {
        data["trades"] = Value::Array(vec![]);
    }

    if data["marketData"]["lastPrice"] == Value::Null {
        data["marketData"]["lastPrice"] = Value::Number(Number::from_i128(0).unwrap());
        data["marketData"]["volume"] = Value::Number(Number::from_i128(0).unwrap());
        data["marketData"]["turnover"] = Value::Number(Number::from_i128(0).unwrap());
        data["marketData"]["changeDelta"] = Value::Number(Number::from_i128(0).unwrap());
        data["marketData"]["prevLastPrice"] = Value::Number(Number::from_i128(0).unwrap());
        data["marketData"]["time"] = Value::Number(Number::from_i128(0).unwrap());
    }

    println!("{}", data);

    Ok(data)
}

pub async fn get_trade_pair_list(
    limit: u64,
    offset: u64,
    app_state: web::Data<AppState>,
) -> Result<Option<Box<Value>>, sqlx::Error> {
    let dt: DateTime<Utc> = Utc::now();
    let delta = dt.timestamp() % 60;
    let time = if delta < 6 {
        dt.timestamp() / 60 * 60 - 60
    } else {
        dt.timestamp() / 60 * 60
    };

    let query = sqlx::raw_sql(&format!(
        r#"
            WITH input AS (
                SELECT * FROM (
                VALUES  (
                    {},
                    {},
                    {}
                )) AS t ("limit", "offset", "time")

            ), config AS (
                SELECT * FROM order_book_config
                LIMIT (SELECT "limit" FROM input)
                OFFSET (SELECT "offset" FROM input)
                
            ), market_data AS (
                SELECT * FROM trade_data_24_hour as td
                WHERE td.timestamp = (SELECT "time" FROM input)

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
                        'isReverse', "is_reverse",

                        'marketData', json_build_object(
                            'lastPrice',
                                CASE WHEN m.last_price IS NOT NULL
                                    THEN m.last_price
                                    ELSE 0
                                END,
                            'volume',
                                CASE WHEN "24_hour_volume" IS NOT NULL
                                    THEN "24_hour_volume"
                                    ELSE 0
                                END,
                            'turnover',
                                CASE WHEN "24_hour_turnover" IS NOT NULL
                                    THEN "24_hour_turnover"
                                    ELSE 0
                                END,
                            'changeDelta',
                                CASE WHEN "24_hour_price_change" IS NOT NULL
                                    THEN "24_hour_price_change"
                                    ELSE 0
                                END,
                            'prevLastPrice',
                                CASE WHEN "24_hour_prev_last_price" IS NOT NULL
                                    THEN "24_hour_prev_last_price"
                                    ELSE 0
                                END,
                            'timestamp', 
                                CASE WHEN m.timestamp IS NOT NULL
                                    THEN m.timestamp
                                    ELSE (SELECT "time" FROM input)
                                END
                        )
                    )
                ) as data

            From config
            LEFT JOIN market_data AS m ON m.book_config = config.pubkey_id;
        "#,
        limit.to_string(),
        offset.to_string(),
        time.to_string()
    ))
    .fetch_one(&app_state.pool)
    .await?;

    let data = query.try_get_raw("data")?.as_str();
    let data: Option<Box<Value>> = match data {
        Ok(data) => serde_json::from_str(data).unwrap(),
        Err(error) => {
            println!("{}", error);
            None
        }
    };

    Ok(data)
}

pub async fn get_market_order_history(
    pubkey_id: Pubkey,
    // interval: PgInterval,
    interval: String,
    limit: u64,
    offset: u64,
    app_state: web::Data<AppState>,
) -> Result<Box<Value>, sqlx::Error> {
    let query = sqlx::raw_sql(&format!(
        r#"
                -- can't do this like this
                -- SET intervalstyle = iso_8601;

                WITH input AS (
                    SELECT * FROM (
                    VALUES  (
                        '{}',
                        '{}',
                        {}, 
                        {}
                    )) AS t ("book_config", "interval", "limit", "offset")
                ), market AS (
                    SELECT 
                        *
                    FROM market_order_history AS m 
                    WHERE m.book_config = (SELECT "book_config" FROM input)
                    AND m.interval = '1m'::interval
                    ORDER BY m.timestamp DESC
                    LIMIT (SELECT "limit" FROM input)
                    OFFSET (SELECT "offset" FROM input)

                ), agg AS (
                    SELECT 
                        m.book_config AS book_config,
                        json_agg(
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
                            ) AS "data"

                    FROM market AS m 
                    WHERE m.book_config = (SELECT "book_config" FROM input)
                    GROUP BY m.book_config

                ), p AS (
                    SELECT 
                        DISTINCT m.book_config AS book_config,

                        CASE
                            WHEN m.interval = '1m'::interval THEN '1m'::TEXT
                            WHEN m.interval = '2m'::interval THEN '2m'::TEXT
                            WHEN m.interval = '5m'::interval THEN '5m'::TEXT
                            WHEN m.interval = '10m'::interval THEN '10m'::TEXT
                            WHEN m.interval = '15m'::interval THEN '15m'::TEXT
                            WHEN m.interval = '20m'::interval THEN '20m'::TEXT
                            WHEN m.interval = '30m'::interval THEN '30m'::TEXT
                            WHEN m.interval = '1h'::interval THEN '1h'::TEXT
                            WHEN m.interval = '2h'::interval THEN '2h'::TEXT
                            WHEN m.interval = '3h'::interval THEN '3h'::TEXT
                            WHEN m.interval = '4h'::interval THEN '4h'::TEXT
                            WHEN m.interval = '6h'::interval THEN '6h'::TEXT
                            WHEN m.interval = '8h'::interval THEN '8h'::TEXT
                            WHEN m.interval = '12h'::interval THEN '12h'::TEXT
                            WHEN m.interval = 'P1D'::interval THEN 'D'::TEXT
                            WHEN m.interval = 'P2D'::interval THEN '2D'::TEXT
                            WHEN m.interval = 'P3D'::interval THEN '3D'::TEXT
                            WHEN m.interval = 'P1W'::interval THEN 'W'::TEXT
                            WHEN m.interval = 'P2W'::interval THEN '2W'::TEXT
                            WHEN m.interval = 'P3W'::interval THEN '3W'::TEXT
                            WHEN m.interval = 'P1M'::interval THEN '1M'::TEXT
                            WHEN m.interval = 'P2M'::interval THEN '2M'::TEXT
                            WHEN m.interval = 'P3M'::interval THEN '3M'::TEXT
                            WHEN m.interval = 'P4M'::interval THEN '4M'::TEXT
                            WHEN m.interval = 'P6M'::interval THEN '6M'::TEXT
                            WHEN m.interval = 'P12M'::interval THEN '12M'::TEXT
                        END AS interval

                    FROM market_order_history AS m 
                    WHERE m.book_config = (SELECT "book_config" FROM input)
                    AND m.interval = (SELECT "interval" FROM input)::interval
                    
                )

                SELECT 
                    json_build_object(
                        'orderBookConfig', p.book_config,
                        'interval', p.interval,
                        'market', m.data
                    )

                FROM agg AS m
                JOIN p ON p.book_config = m.book_config;
            "#,
        pubkey_id.to_string(),
        interval,
        limit,
        offset,
    ))
    .fetch_one(&app_state.pool)
    .await;

    if query.is_err() {
        println!(
            "error being cleaned to empty array:: {}",
            query.unwrap_err()
        );
        return Ok(Box::new(Value::Null));
    }

    let data: Box<Value> = serde_json::from_str(
        query
            .unwrap()
            .try_get_raw("json_build_object")
            .unwrap()
            .as_str()
            .unwrap(),
    )
    .unwrap();

    Ok(data)
}

pub async fn get_open_positions(
    market_maker: Pubkey,
    app_state: web::Data<AppState>,
) -> Result<Option<Box<Value>>, sqlx::Error> {
    let query = sqlx::raw_sql(&format!(
        r#"
            WITH input AS (
                SELECT * FROM (
                VALUES  (
                    {}
                )) AS t ("market_maker")
            ), positions AS (
                SELECT
                    json_build_object(
                        'positionId', p.pubkey_id,
                        'marketId', p.book_config,
                        'ticker', b.ticker,
                        'positionConfig', p.position_config,
                        'orderType', p.order_type,
                        'price', p.price,
                        'size', p.size,
                        'fill', p.fill,
                        'slot', p.slot,
                        'timestamp', p.timestamp
                    ) AS "data"

                FROM order_position_config AS c
                JOIN order_position AS p ON p.position_config = c.pubkey_id
                JOIN order_book_config AS b ON b.pubkey_id = p.book_config
                WHERE c.market_maker = (SELECT market_maker FROM input) 
                AND p.size != p.fill
                ORDER BY p.book_config DESC, p.slot DESC
                
            )

            SELECT
                array_agg(
                    p.data
                ) AS "data"

            FROM positions AS p;
        "#,
        market_maker.to_string()
    ))
    .fetch_one(&app_state.pool)
    .await;

    if query.is_err() {
        println!(
            "error being cleaned to empty array:: {}",
            query.unwrap_err()
        );
        return Ok(Some(Box::new(json!([]))));
    }

    let query = query.unwrap();
    let data = query.try_get_raw("data")?.as_str();
    let data: Option<Box<Value>> = match data {
        Ok(data) => serde_json::from_str(data).unwrap(),
        Err(error) => {
            println!("error being cleaned to empty array:: {}", error);
            return Ok(Some(Box::new(json!([]))));
        }
    };

    Ok(data)
}

pub async fn delete_order_position(pubkey_id: Pubkey, app_state: &AppState) {
    match sqlx::raw_sql(&format!(
        r#"
                DELETE FROM order_position
                WHERE pubkey_id == '{}';
            "#,
        pubkey_id.to_string()
    ))
    .execute(&app_state.pool)
    .await
    {
        Ok(data) => println!("DELETE ORDER POSIITON: {:?}", data),
        Err(error) => println!("DELETE ORDER POSIITON ERROR: {}", error),
    };
}

// functionality not implemented yet
pub async fn _delete_position_config(pubkey_id: String, app_state: &AppState) {
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
pub async fn _delete_order_book_config(pubkey_id: String, app_state: &AppState) {
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

    match sqlx::raw_sql(&format!(
        r#"
            DELETE FROM real_time_trade_data  AS td
            WHERE {timestamp} - td.timestamp >= 86400;
        "#
    ))
    .execute(pool)
    .await
    {
        Ok(data) => println!("DELETE REAL TRADE: {:?}", data),
        Err(error) => println!("DELETE REAL TRADE ERROR: {}", error),
    }
}

pub async fn update_order_position(
    id: Pubkey,
    size: u64,
    is_available: bool,
    app_state: &AppState,
) {
    match sqlx::raw_sql(&format!(
        r#"
                UPDATE order_position AS p SET "is_available" = {}, "fill" = p.size - {}
                WHERE p.pubkey_id = '{}'
                -- need implement delete when fill == size
            "#,
        is_available,
        size.to_string(),
        id.to_string(),
    ))
    .execute(&app_state.pool)
    .await
    {
        Ok(data) => println!("DELETE UPDATE ORDER POSITION: {:?}", data),
        Err(error) => println!("DELETE UPDATE ORDER POSITION ERROR: {}", error),
    };
}

// need add the position config id, right now it's just jank
pub async fn open_limit_order(
    pubkey_id: Pubkey,
    position_config: Pubkey,
    order_type: &Order,
    price: u64,
    app_state: web::Data<AppState>,
) -> Result<OpenLimitOrder, sqlx::Error> {
    // need to implement to_string for Order
    let order_type = match *order_type {
        Order::Ask => "ask",
        Order::Bid => "bid",
        _ => unreachable!(),
    };

    println!(
        "price {}, order_type {}, pubkey {}",
        price,
        order_type,
        position_config.to_string()
    );

    match sqlx::raw_sql(&format!(
        r#"
            WITH input AS (
            SELECT * FROM (
                VALUES  (
                    '{}',
                    '{}',
                    {}, 
                    '{}'::order_type
                )) AS t ("book_config", "position_config", "price", "order_type")

            ), trade_pair AS (
                SELECT * FROM order_book_config AS obc
                WHERE obc.pubkey_id = (SELECT "book_config" FROM input)

            ), ledger AS (
                SELECT
                    op.pubkey_id AS "pubkey_id",
                    op.next_position AS "next_position",
                    op.order_type AS "order_type",
                    op.price AS "price",
                    op.slot AS "slot"

                FROM order_position AS op
                WHERE op.book_config = (SELECT "book_config" FROM input) 
                AND op.order_type = (SELECT "order_type" FROM input)
                AND op.is_available = 't'
                ORDER BY op.price ASC

            ), min_price AS (
                SELECT 
                    ledger.pubkey_id AS "pubkey_id",
                    ledger.next_position AS "next_position",
                    ledger.order_type AS "order_type",
                    ledger.price AS "price",
                    ledger.slot AS "slot"

                FROM ledger
                JOIN (
                    SELECT
                        ledger.pubkey_id,
                        l.price,
                        MIN(ledger.slot) AS slot

                    FROM (
                        SELECT
                            MIN(ledger.price) as price

                        FROM ledger
                        WHERE (
                            ledger.order_type = 'bid'::order_type
                            AND ledger.price >= (SELECT price FROM input))
                        OR (
                            ledger.order_type = 'ask'::order_type
                            AND ledger.price > (SELECT price FROM input))

                    ) AS l
                    JOIN ledger ON l.price = ledger.price
                    GROUP BY GROUPING SETS (
                        (1, 2)
                    )
                ) AS _min ON _min.pubkey_id = ledger.pubkey_id

            ), max_price AS (
                SELECT 
                    ledger.pubkey_id AS "pubkey_id",
                    ledger.next_position AS "next_position",
                    ledger.order_type AS "order_type",
                    ledger.price AS "price",
                    ledger.slot AS "slot"

                FROM ledger
                JOIN (
                    SELECT
                        ledger.pubkey_id,
                        l.price,
                        MIN(ledger.slot) AS slot

                    FROM (
                        SELECT
                            MAX(ledger.price) as price

                        FROM ledger
                        WHERE  (
                            ledger.order_type = 'bid'::order_type
                            AND ledger.price < (SELECT price FROM input))
                        OR (
                            ledger.order_type = 'ask'::order_type
                            AND ledger.price <= (SELECT price FROM input))

                    ) AS l
                    JOIN ledger ON l.price = ledger.price
                    GROUP BY GROUPING SETS (
                        (1, 2)
                    )
                ) AS _min ON _min.pubkey_id = ledger.pubkey_id

            ), head_ask AS (
                SELECT 
                    pubkey_id,
                    price
                FROM order_position AS p
                WHERE p.book_config = (SELECT "book_config" FROM input)
                AND p.order_type = 'ask' AND p.is_head
                LIMIT 1

            ), head_bid AS (
                SELECT 
                    pubkey_id,
                    price
                FROM order_position AS p
                WHERE p.book_config = (SELECT "book_config" FROM input)
                AND p.order_type = 'bid' AND p.is_head
                LIMIT 1

            ), node AS (
                SELECT 
                    (SELECT book_config FROM input) AS book_config,
                    CASE
                        WHEN order_type = 'bid' 
                        AND ((
                            min_pubkey_id IS NOT NULL
                            AND max_pubkey_id IS NOT NULL )
                        OR (
                            min_pubkey_id IS NOT NULL
                            AND max_pubkey_id IS NULL ))
                                THEN min_pubkey_id


                        WHEN order_type = 'ask'  
                        AND ((
                            min_pubkey_id IS NOT NULL
                            AND max_pubkey_id IS NOT NULL)
                        OR (
                            max_pubkey_id IS NOT NULL
                            AND min_pubkey_id IS NULL
                            AND max_next_position IS NULL))
                                THEN max_pubkey_id

                        
                        ELSE NULL
                    END AS prev_pubkey_id,

                    CASE
                        WHEN order_type = 'bid' 
                        AND ((
                            min_pubkey_id IS NOT NULL
                            AND max_pubkey_id IS NOT NULL)
                        OR (
                            min_pubkey_id IS NULL
                            AND max_pubkey_id IS NOT NULL ))
                                THEN max_pubkey_id


                        WHEN order_type = 'ask'  
                        AND (( 
                            min_pubkey_id IS NOT NULL
                            AND max_pubkey_id IS NOT NULL)
                        OR (
                            min_pubkey_id IS NOT NULL
                            AND max_pubkey_id IS NULL))
                                THEN min_pubkey_id
                        
                        ELSE NULL
                    END AS next_pubkey_id
                
                FROM (
                    SELECT
                        min_price.order_type AS order_type,
                        max_price.slot AS slot,

                        min_price.pubkey_id AS min_pubkey_id, 
                        min_price.price AS min_price,
                        min_price.next_position AS min_next_position, 
                        min_price.slot AS min_slot,

                        max_price.pubkey_id AS max_pubkey_id, 
                        max_price.price AS max_price,
                        max_price.next_position AS max_next_position, 
                        max_price.slot AS max_slot
                    FROM min_price, max_price
                    WHERE ( min_price.order_type = 'bid'::order_type
                        AND min_price.next_position = max_price.pubkey_id )
                    OR 
                        ( max_price.order_type = 'ask'::order_type
                        AND max_price.next_position = min_price.pubkey_id )

                    UNION
                    SELECT
                        ledger.order_type AS order_type,
                        ledger.slot AS slot,

                        min_price.pubkey_id AS min_pubkey_id, 
                        min_price.price AS min_price,
                        min_price.next_position AS min_next_position, 
                        min_price.slot AS min_slot,

                        NULL AS max_pubkey_id, 
                        NULL AS max_price,
                        NULL AS max_next_position, 
                        NULL AS max_slot
                    FROM ledger
                    LEFT JOIN min_price ON min_price.pubkey_id = ledger.pubkey_id
                    LEFT JOIN max_price ON max_price.pubkey_id = ledger.pubkey_id
                    WHERE min_price.pubkey_id IS NOT NULL AND max_price.pubkey_id IS NULL
                    AND ((
                        ledger.order_type = 'bid'::order_type
                        AND min_price.next_position IS NULL
                    ) OR (
                        ledger.order_type = 'ask'::order_type
                        AND (SELECT pubkey_id FROM head_ask) = min_price.pubkey_id
                        AND (SELECT price FROM input) < min_price.price
                    ))

                    UNION
                    SELECT
                        ledger.order_type AS order_type,
                        ledger.slot AS slot,

                        NULL AS min_pubkey_id, 
                        NULL AS min_price,
                        NULL AS min_next_position, 
                        NULL AS min_slot,

                        max_price.pubkey_id AS max_pubkey_id, 
                        max_price.price AS max_price,
                        max_price.next_position AS max_next_position, 
                        max_price.slot AS max_slot

                    FROM ledger
                    LEFT JOIN min_price ON min_price.pubkey_id = ledger.pubkey_id
                    LEFT JOIN max_price ON max_price.pubkey_id = ledger.pubkey_id
                    WHERE max_price.pubkey_id IS NOT NULL AND min_price.pubkey_id IS NULL
                    AND ((
                        ledger.order_type = 'ask'::order_type
                        AND max_price.next_position IS NULL
                    ) OR (
                        ledger.order_type = 'bid'::order_type
                        AND (SELECT pubkey_id FROM head_bid) = max_price.pubkey_id
                        AND (SELECT price FROM input) > max_price.price
                    ))
                ) AS r

                WHERE ( 
                    min_pubkey_id IS NULL
                    AND max_pubkey_id IS NULL
                    
                ) OR ((SELECT order_type FROM input) = 'bid'::order_type AND (
                    min_pubkey_id IS NOT NULL
                    AND max_pubkey_id IS NOT NULL
                    AND min_next_position = max_pubkey_id
                    
                ) OR (
                    -- not sure -> set head
                    min_pubkey_id IS NULL
                    AND max_pubkey_id IS NOT NULL
                    AND (max_next_position IS NULL
                    OR  max_pubkey_id = (SELECT pubkey_id FROM head_bid))

                ) OR (
                    min_pubkey_id IS NOT NULL
                    AND max_pubkey_id IS NULL

                )) OR ((SELECT order_type FROM input) = 'ask'::order_type AND (
                    min_pubkey_id IS NOT NULL
                    AND max_pubkey_id IS NOT NULL
                    AND max_next_position = min_pubkey_id

                ) OR (
                    -- not sure -> set head
                    max_pubkey_id IS NULL
                    AND min_pubkey_id IS NOT NULL
                    AND (min_next_position IS NULL
                    OR min_pubkey_id = (SELECT pubkey_id FROM head_ask))

                ) OR (
                    min_pubkey_id IS NULL
                    AND max_pubkey_id IS NOT NULL
                ))
            )

            SELECT 
                t.pubkey_id AS book_config,

                CASE 
                    WHEN (SELECT order_type FROM input) = 'bid'::order_type
                        THEN t.sell_market
                    WHEN (SELECT order_type FROM input) = 'ask'::order_type
                        THEN t.buy_market
                END AS market_pointer,

                CASE 
                    WHEN (SELECT order_type FROM input) = 'bid'::order_type
                        THEN t.buy_market
                    WHEN (SELECT order_type FROM input) = 'ask'::order_type
                        THEN t.sell_market
                END AS contra_pointer,

                (SELECT order_type FROM input) as order_type,
                t.token_mint_a,
                t.token_mint_b,
                t.token_program_a,
                t.token_program_b,
                t.is_reverse::BOOLEAN as is_reverse,
                pc.pubkey_id AS position_config,
                pc.market_maker,
                pc.capital_a,
                pc.capital_b,
                pc.vault_a,
                pc.vault_b,
                pc.nonce,
                pc.reference,
                node.prev_pubkey_id,
                node.next_pubkey_id,

                (SELECT price FROM head_ask) AS head_ask_price,
                (SELECT price FROM head_bid) AS head_bid_price,
                (SELECT pubkey_id FROM head_ask) AS head_ask_pubkey_id,
                (SELECT pubkey_id FROM head_bid) AS head_bid_pubkey_id

            FROM trade_pair AS t
            LEFT JOIN node ON node.book_config = t.pubkey_id
            LEFT JOIN (
                SELECT 
                    pc.pubkey_id,
                    pc.market_maker,
                    pc.capital_a,
                    pc.capital_b,
                    pc.vault_a,
                    pc.vault_b,
                    pc.nonce,
                    pc.reference,
                    (SELECT book_config FROM input) AS book_config
                FROM order_position_config AS pc
                WHERE pc.pubkey_id = (SELECT position_config FROM input)

            ) AS pc ON pc.book_config = t.pubkey_id;
        "#,
        pubkey_id.to_string(),
        position_config.to_string(),
        price.to_string(),
        order_type,
    ))
    .fetch_one(&app_state.pool)
    .await
    {
        Ok(query) => {
            let order_book_data =
                (!query.try_get_raw("book_config").unwrap().is_null()).then(|| {
                    let data = query.try_get_raw("book_config").unwrap().as_str().unwrap();
                    let book_config = Pubkey::from_str(data).unwrap();

                    let data = query
                        .try_get_raw("market_pointer")
                        .unwrap()
                        .as_str()
                        .unwrap();
                    let market_pointer = Pubkey::from_str(data).unwrap();

                    let data = query
                        .try_get_raw("contra_pointer")
                        .unwrap()
                        .as_str()
                        .unwrap();
                    let contra_pointer = Pubkey::from_str(data).unwrap();

                    let data = query.try_get_raw("token_mint_a").unwrap().as_str().unwrap();
                    let token_mint_a = Pubkey::from_str(data).unwrap();

                    let data = query.try_get_raw("token_mint_b").unwrap().as_str().unwrap();
                    let token_mint_b = Pubkey::from_str(data).unwrap();

                    let data = query
                        .try_get_raw("token_program_a")
                        .unwrap()
                        .as_str()
                        .unwrap();
                    let token_program_a = Pubkey::from_str(data).unwrap();

                    let data = query
                        .try_get_raw("token_program_b")
                        .unwrap()
                        .as_str()
                        .unwrap();
                    let token_program_b = Pubkey::from_str(data).unwrap();

                    let order_type =
                        match query.try_get_raw("order_type").unwrap().as_str().unwrap() {
                            "ask" => Order::Ask,
                            "bid" => Order::Bid,
                            _ => unreachable!(),
                        };

                    let is_reverse =
                        // doing this because apparently the DB returns boolean value as t/f
                        // not as 0 or 1... why?? no idea.
                        // though was not an issue when I was playing around with this eariler
                        // UPDATE:
                        // I found out the possible reason why this is happening
                        // locally the way to do it is by deserialize the bytes
                        // but supabase environment returns everything as a string
                        // the reason why integers and booleans are failing
                        // is there a configuration that sets postgress to do this?
                        // or is supa base handinging this on there own? and why send
                        // everything as a string?
                        query.try_get_raw("is_reverse").unwrap().as_str().unwrap() != "f";

                    // query.try_get_raw("is_reverse").unwrap().as_bytes().unwrap()[0] != 0;
                    println!(
                        "PRE:: {:?}, {:?}",
                        query.try_get_raw("is_reverse").unwrap().as_bytes(),
                        query.try_get_raw("is_reverse").unwrap().as_str(),
                    );
                    (
                        book_config,
                        market_pointer,
                        token_mint_a,
                        token_mint_b,
                        token_program_a,
                        token_program_b,
                        order_type,
                        is_reverse,
                        contra_pointer,
                    )
                });

            let position_data =
                (!query.try_get_raw("position_config").unwrap().is_null()).then(|| {
                    let data = query
                        .try_get_raw("position_config")
                        .unwrap()
                        .as_str()
                        .unwrap();
                    let position_config = Pubkey::from_str(data).unwrap();

                    let data = query.try_get_raw("market_maker").unwrap().as_str().unwrap();
                    let market_maker = Pubkey::from_str(data).unwrap();

                    let data = query.try_get_raw("capital_a").unwrap().as_str().unwrap();
                    let capital_a = Pubkey::from_str(data).unwrap();

                    let data = query.try_get_raw("capital_b").unwrap().as_str().unwrap();
                    let capital_b = Pubkey::from_str(data).unwrap();

                    let data = query.try_get_raw("vault_a").unwrap().as_str().unwrap();
                    let vault_a = Pubkey::from_str(data).unwrap();

                    let data = query.try_get_raw("vault_b").unwrap().as_str().unwrap();
                    let vault_b = Pubkey::from_str(data).unwrap();

                    let _data = query.try_get_raw("nonce").unwrap().as_bytes().unwrap();
                    let nonce = 0;
                    // not being handled correctly
                    // u64::from_be_bytes(data[..8].try_into().expect("epected slice of 8 bytes"));

                    let _data = query.try_get_raw("reference").unwrap().as_bytes().unwrap();
                    let reference = 0;
                    // not being handled correctly
                    // u64::from_be_bytes(data[..8].try_into().expect("epected slice of 8 bytes"));
                    (
                        position_config,
                        market_maker,
                        capital_a,
                        capital_b,
                        vault_a,
                        vault_b,
                        nonce,
                        reference,
                    )
                });

            let prev_pubkey_id =
                (!query.try_get_raw("prev_pubkey_id").unwrap().is_null()).then(|| {
                    Pubkey::from_str(
                        query
                            .try_get_raw("prev_pubkey_id")
                            .unwrap()
                            .as_str()
                            .unwrap(),
                    )
                    .unwrap()
                });

            let next_pubkey_id =
                (!query.try_get_raw("next_pubkey_id").unwrap().is_null()).then(|| {
                    Pubkey::from_str(
                        query
                            .try_get_raw("next_pubkey_id")
                            .unwrap()
                            .as_str()
                            .unwrap(),
                    )
                    .unwrap()
                });

            let head_ask_price: Option<u64> =
                (!query.try_get_raw("head_ask_price").unwrap().is_null()).then(|| {
                    println!(
                        "PRE ASK PRICE:: {:?}, {:?}",
                        query.try_get_raw("head_ask_price").unwrap().as_bytes(),
                        query.try_get_raw("head_ask_price").unwrap().as_str(),
                    );
                    // u64::from_be_bytes(
                    //     query
                    //         .try_get_raw("head_ask_price")
                    //         .unwrap()
                    //         .as_bytes()
                    //         .unwrap()[..8]
                    //         .try_into()
                    //         .expect("8 bytes"),
                    // )

                    return query
                        .try_get_raw("head_ask_price")
                        .unwrap()
                        .as_str()
                        .unwrap()
                        .parse()
                        .expect("expect integer value");
                });

            let head_bid_price: Option<u64> =
                (!query.try_get_raw("head_bid_price").unwrap().is_null()).then(|| {
                    println!(
                        "PRE BID PRICE:: {:?}, {:?}",
                        query.try_get_raw("head_bid_price").unwrap().as_bytes(),
                        query.try_get_raw("head_bid_price").unwrap().as_str(),
                    );
                    // u64::from_be_bytes(
                    //     query
                    //         .try_get_raw("head_bid_price")
                    //         .unwrap()
                    //         .as_bytes()
                    //         .unwrap()[..8]
                    //         .try_into()
                    //         .expect("8 bytes"),
                    // )
                    return query
                        .try_get_raw("head_bid_price")
                        .unwrap()
                        .as_str()
                        .unwrap()
                        .parse()
                        .expect("expect integer value");
                });

            let head_ask_pubkey_id = (!query.try_get_raw("head_ask_pubkey_id").unwrap().is_null())
                .then(|| {
                    Pubkey::from_str(
                        query
                            .try_get_raw("head_ask_pubkey_id")
                            .unwrap()
                            .as_str()
                            .unwrap(),
                    )
                    .unwrap()
                });

            let head_bid_pubkey_id = (!query.try_get_raw("head_bid_pubkey_id").unwrap().is_null())
                .then(|| {
                    Pubkey::from_str(
                        query
                            .try_get_raw("head_bid_pubkey_id")
                            .unwrap()
                            .as_str()
                            .unwrap(),
                    )
                    .unwrap()
                });

            let data = order_book_data.unwrap();

            let market_pointer = (
                data.1,
                (prev_pubkey_id.is_none()
                    && ((head_bid_price.is_none() && head_ask_price.is_none())
                        || (head_bid_price.is_some()
                            && head_ask_price.is_some()
                            && head_bid_price.unwrap() < price
                            && price < head_ask_price.unwrap())
                        || (data.6 == Order::Ask
                            && head_bid_price.is_some()
                            && head_bid_price.unwrap() < price)
                        || (data.6 == Order::Bid
                            && head_ask_price.is_some()
                            && price < head_ask_price.unwrap()))),
            );

            println!("next_pubkey_id {:?}", next_pubkey_id);

            let next_pubkey_id =
                if prev_pubkey_id.is_none() && next_pubkey_id.is_none() && data.6 == Order::Bid {
                    head_bid_pubkey_id
                } else if prev_pubkey_id.is_none() && data.6 == Order::Ask {
                    head_ask_pubkey_id
                } else {
                    next_pubkey_id
                };

            println!("head_bid_pubkey_id {:?}", head_bid_pubkey_id);
            println!("head_ask_pubkey_id {:?}", head_ask_pubkey_id);

            println!("prev_pubkey_id {:?}", prev_pubkey_id);
            println!("next_pubkey_id {:?}", next_pubkey_id);
            println!("head_bid_price {:?}", head_bid_price);
            println!("head_ask_price {:?}", head_ask_price);
            println!("market_pointer {:?}", market_pointer.0);
            println!("contra_pointer {:?}", data.8);
            println!("market_pointer_write? {:?}", market_pointer.1);

            println!("price {:?}", price);

            Ok(OpenLimitOrder {
                _book_config: data.0,
                market_pointer,
                contra_pointer: data.8,
                token_mint_a: data.2,
                token_mint_b: data.3,
                token_program_a: data.4,
                token_program_b: data.5,
                position_config: position_data.is_some().then(|| position_data.unwrap().0),
                _market_maker: position_data.is_some().then(|| position_data.unwrap().1),
                _capital_a: position_data.is_some().then(|| position_data.unwrap().2),
                _capital_b: position_data.is_some().then(|| position_data.unwrap().3),
                _vault_a: position_data.is_some().then(|| position_data.unwrap().4),
                _vault_b: position_data.is_some().then(|| position_data.unwrap().5),
                prev_position: prev_pubkey_id,
                next_position: next_pubkey_id,
                _order_type: data.6,
                _nonce: position_data.is_some().then(|| position_data.unwrap().6),
                _reference: position_data.is_some().then(|| position_data.unwrap().7),
                is_reverse: data.7,
            })
        }
        Err(error) => {
            println!("OPEN LIMIT ORDER FAILURE :: {}", error);
            return Err(error);
        }
    }
}
