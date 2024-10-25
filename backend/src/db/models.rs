use {
    crate::AppState,
    actix_web::web,
    chrono::prelude::*,
    serde::{Deserialize, Serialize},
    serde_json::{value::Value, Number},
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
                INSERT INTO order_position (
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

// handled by a scheduler, currently only implemented for 1 interval -> '1m'
pub async fn insert_market_order_history(pool: &Pool<Postgres>) {
    let dt: DateTime<Utc> = Utc::now();
    let start = dt.timestamp() / 60 * 60 - 60;
    let end = start + 60;

    sqlx::raw_sql(
        &format!(r#"
                WITH chart AS (
                    SELECT 
                        * 
                    FROM real_time_trade_data AS td
                    WHERE {}::bigint <= td.timestamp AND {}::bigint > td.timestamp

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

                ), market_data AS (
                    SELECT 
                        DISTINCT chart.book_config AS "pubkey_id",
                        '1m'::interval AS "interval",
                        o.last_price  AS "open",
                        h.last_price as "high",
                        l.last_price as "low",
                        c.last_price  AS "close",
                        t.volume,
                        t.turnover,
                        {}::bigint AS "timestamp"
                    FROM chart
                    INNER JOIN open_price AS o ON o.book_config = chart.book_config
                    INNER JOIN close_price AS c ON c.book_config = chart.book_config
                    INNER JOIN high_price AS h ON h.book_config = chart.book_config
                    INNER JOIN low_price AS l ON l.book_config = chart.book_config
                    INNER JOIN total AS t ON t.book_config = chart.book_config

                    -- just thought of this now, can do this instead of using DISTINCT, but need to test it
                    -- WHERE chart.book_config
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
                SELECT * FROM market_data;
            "#, start, end, start)
    )
    // .bind(start.to_string())
    // .bind(end.to_string())
    // .persistent(false)
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
                        -- should also include capital source and captial dest?
                        -- what other data do I need?
                        op.pubkey_id AS "pubkey_id", 
                        opc.pubkey_id AS "position_config", 
                        op.next_position AS "next_position", 
                        opc.market_maker AS "market_maker", 
                        op.order_type AS "order_type", 
                        op.price AS "price", 
                        op.size AS "size", 
                        op.is_available AS  "is_available", 
                        
                        CASE
                            WHEN (NOT s.is_reverse AND op.order_type = 'bid')
                                OR (s.is_reverse AND op.order_type = 'ask')
                                THEN opc.vault_a
                            WHEN (NOT s.is_reverse AND op.order_type = 'ask')
                                OR (s.is_reverse AND op.order_type = 'bid')
                                THEN opc.vault_b
                        END AS "source",

                        
                        CASE
                            WHEN (NOT s.is_reverse AND op.order_type = 'bid')
                                OR (s.is_reverse AND op.order_type = 'ask')
                                THEN opc.vault_b
                            WHEN (NOT s.is_reverse AND op.order_type = 'ask')
                                OR (s.is_reverse AND op.order_type = 'bid')
                                THEN opc.vault_a
                        END AS "destination",

                        op.slot AS "slot", 
                        op.timestamp AS "timestamp"

                    FROM order_position_config AS opc
                    JOIN order_position AS op ON op.position_config = opc.pubkey_id
                    JOIN trade_pair AS s ON s.pubkey_id = $1
                    WHERE opc.book_config = $1
                    -- ORDER BY op.price ASC

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
                        p.source,
                        p.destination,
                        p.slot,
                        p.timestamp

                    FROM position AS p
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
                        p.source,
                        p.destination,
                        p.slot,
                        p.timestamp

                    FROM position AS p
                    ORDER BY p.price ASC, p.slot ASC

                ), book AS (
                    SELECT 
                        $1 AS "pubkey_id",
                        -- it's an array so that book::<side> is indexable to get last price, but is wrong impl
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
                                'source', a.source,
                                'destination', a.destination,
                                'slot', a.slot,
                                'timestamp', a.timestamp
                            )
                        ) AS asks,

                        -- it's an array so that book::<side> is indexable to get last price, but is wrong impl
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
                                'source', b.source,
                                'destination', b.destination,
                                'slot', b.slot,
                                'timestamp', b.timestamp
                            )
                        ) AS bids

                    FROM bids AS b, asks AS a
                    WHERE NOT b.pubkey_id = NULL AND NOT a.pubkey_id = NULL

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
                            'nextBuyPrice', book.asks[0],
                            'nextSellPrice', book.bids[0],
                            'asks', book.asks,
                            'bids', book.bids
                        )
                    )

                FROM trade_pair AS t
                LEFT JOIN book ON t.pubkey_id = book.pubkey_id;
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

    if data["book"]["nextBuyPrice"] == Value::Null {
        data["book"]["nextBuyPrice"] = Value::Number(Number::from_f64(0 as f64).unwrap());
    }

    if data["book"]["nextSellPrice"] == Value::Null {
        data["book"]["nextSellPrice"] = Value::Number(Number::from_f64(0 as f64).unwrap());
    }

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
    let query = sqlx::query(
        r#"
                WITH config AS (
                    SELECT * FROM order_book_config
                    LIMIT $1
                    OFFSET $2
                    
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
                            'isReversal', "is_reverse"
                        )
                    )

                From config;
        "#,
    )
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

// WIP
pub async fn get_current() {}

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
