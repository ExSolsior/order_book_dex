use {
    crate::AppState,
    actix_web::web,
    chrono::prelude::*,
    serde::{Deserialize, Serialize},
    serde_json::value::Value,
    solana_sdk::pubkey::Pubkey,
    sqlx::{
        prelude::FromRow,
        // types::{Json, JsonRawValue},
        Pool,
        Postgres,
        Row,
    },
};

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
                INSERT INTO order_position (
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
                INSERT INTO order_position (
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

// handled by a scheduler, currently only implemented for 1 interval -> '1m'
pub async fn insert_market_order_history(pool: &Pool<Postgres>) {
    let dt: DateTime<Utc> = Utc::now();
    let start = dt.timestamp() / 60 * 60 - 60;
    let end = start + 60;

    sqlx::raw_sql(
        &format!(r#"
                WITH chart AS (
                    SELECT * 
                    FROM real_time_trade_data AS td
                    WHERE {}::bigint <= td.timestamp AND {}::bigint > td.timestamp

                ), open_time AS (
                    SELECT 
                        MIN("timestamp") AS "timestamp",
                        order_book_config_pubkey
                    FROM chart
                    GROUP BY order_book_config_pubkey

                ), close_time AS (
                    SELECT 
                        MAX("timestamp") AS "timestamp",
                        order_book_config_pubkey
                    FROM chart
                    GROUP BY order_book_config_pubkey

                ), open_price AS (
                    SELECT 
                        t.order_book_config_pubkey,
                        last_price
                    FROM chart 
                    JOIN open_time AS t ON t.order_book_config_pubkey = chart.order_book_config_pubkey
                    AND t.timestamp = chart.timestamp

                ), close_price AS (
                    SELECT 
                        t.order_book_config_pubkey,
                        last_price
                    FROM chart 
                    JOIN close_time AS t ON t.order_book_config_pubkey = chart.order_book_config_pubkey
                    AND t.timestamp = chart.timestamp

                ), low_price AS (
                    SELECT 
                        order_book_config_pubkey,
                        MIN(chart.last_price) AS last_price
                    FROM chart 
                    GROUP BY order_book_config_pubkey

                ), high_price AS (
                    SELECT 
                        order_book_config_pubkey,
                        MAX(chart.last_price) AS last_price
                    FROM chart 
                    GROUP BY order_book_config_pubkey

                ), total AS (
                    SELECT 
                        order_book_config_pubkey,
                        sum(chart.amount) AS "volume",
                        sum(chart.last_price) AS "turnover"
                    FROM chart
                    GROUP BY order_book_config_pubkey

                ), market_data AS (
                    SELECT 
                        DISTINCT chart.order_book_config_pubkey AS "pubkey_id",
                        '1m'::interval AS "interval",
                        o.last_price  AS "open",
                        h.last_price as "high",
                        l.last_price as "low",
                        c.last_price  AS "close",
                        t.volume,
                        t.turnover,
                        {}::bigint AS "timestamp"
                    FROM chart
                    INNER JOIN open_price AS o ON o.order_book_config_pubkey = chart.order_book_config_pubkey
                    INNER JOIN close_price AS c ON c.order_book_config_pubkey = chart.order_book_config_pubkey
                    INNER JOIN high_price AS h ON h.order_book_config_pubkey = chart.order_book_config_pubkey
                    INNER JOIN low_price AS l ON l.order_book_config_pubkey = chart.order_book_config_pubkey
                    INNER JOIN total AS t ON t.order_book_config_pubkey = chart.order_book_config_pubkey

                    -- just thought of this now, can do this instead of using DISTINCT, but need to test it
                    -- WHERE chart.order_book_config_pubkey
                )

                INSERT INTO market_order_history (
                    "order_book_config_pubkey",
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
                    JOIN trade_pair AS s ON s.pubkey_id = $1
                    WHERE opc.order_book_config_pubkey = $1
                    -- ORDER BY op.price ASC

                ), bids AS (
                    SELECT
                        p.pubkey_id,
                        p.order_pos_config,
                        p.next_order_pos,
                        p.market_maker_pubkey,
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
                        p.order_pos_config,
                        p.next_order_pos,
                        p.market_maker_pubkey,
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
                                'orderPosConfig', a.order_pos_config,
                                'nextOrderPos', a.next_order_pos,
                                'marketMakerPubkey', a.market_maker_pubkey,
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
                                'orderPosConfig', b.order_pos_config,
                                'nextOrderPos', b.next_order_pos,
                                'marketMakerPubkey', b.market_maker_pubkey,
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
                        'sellMarketPointer', t.sell_market_pointer_pubkey,
                        'buyMarketPointer', t.buy_market_pointer_pubkey,
                        'tokenDecimalsA', t.token_mint_a_decimal,
                        'tokenDecimalsB', t.token_mint_b_decimal,
                        'tokenSymbolA', t.token_mint_a_symbol,
                        'tokenSymbolB', t.token_mint_b_symbol,
                        'isReverse', t.is_reverse,
                        'book', json_build_object(
                            -- not correct representation of price, it's possible that market pointer did match with position, but is pointer
                            'lastBuyPrice', book.asks[0],
                            -- not correct representation of price, it's possible that market pointer did match with position, but is pointer
                            'lastSellPrice', book.bids[0],
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

    if data["book"]["bids"] == Value::Null {
        data["book"]["bids"] = Value::Array(vec![]);
    }

    if data["book"]["asks"] == Value::Null {
        data["book"]["asks"] = Value::Array(vec![]);
    }

    Ok(data)
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
