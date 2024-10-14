CREATE TYPE order_type as ENUM (
    'buy',
    'sell',
    'bid',
    'ask'
);

CREATE TYPE interval as ENUM (
    '1_min',
    '2_min',
    '5_min',
    '10_min',
    '15_min',
    '20_min',
    '30_min',
    '1_hour',
    '2_hour',
    '3_hour',   
    '4_hour',
    '8_hour',
    '12_hour',
    '24_hour',
    '48_hour',
    '1_week',
)

CREATE TABLE order_position_table (
    "pubkey_id"                        bytea PRIMARY KEY,
    "order_type"                        order_type NOT NULL,
    "price"                             bigserial NOT NULL,
    "size"                              bigserial NOT NULL,
    "is_available"                      boolean NOT NULL,
    "next_order_position_pubkey"        bytea NOT NULL,
    "order_position_config_pubkey"      bytea NOT NULL REFERENCES order_position_config_table (pubkey_id),
    "slot"                              bigserial NOT NULL,
    "timestamp"                         bigserial NOT NULL
);

CREATE TABLE order_position_config_table (
    "pubkey_id"                 bytea PRIMARY KEY,
    "order_book_config_pubkey"  bytea NOT NULL REFERENCES order_book_config_table (pubkey_id),
    "market_maker_pubkye"       bytea NOT NULL,
    "vault_a_pubkey"            bytea NOT NULL,
    "vault_b_pubkey"            bytea NOT NULL,
    "nonce"                     bigserial,
    "reference"                 bigserial
);

CREATE TABLE order_book_config_table (
    "pubkey_id"                     bytea PRIMARY KEY,
    "token_mint_a"                  bytea NOT NULL, 
    "token_mint_b"                  bytea NOT NULL, 
    "token_program_a"               bytea NOT NULL, 
    "token_program_b"               bytea NOT NULL, 
    "sell_market_pointer_pubkey"    bytea NOT NULL, 
    "buy_market_pointer_pubkey"     bytea NOT NULL, 
    "token_mint_a_decimal"          smallint NOT NULL,
    "token_mint_b_decimal"          smallint NOT NULL,
    "token_mint_a_symbol"           varchar(5) NOT NULL,
    "token_mint_b_symbol"           varchar(5) NOT NULL,
    "is_reverse"                    boolean NOT NULL
);

CREATE TABLE market_order_histry (
    "id"                        bigserial PRIMARY KEY,
    "order_book_config_pubkey"  bytea NOT NULL REFERENCES order_book_config_table (pubkey_id),
    "interval"                  interval NOT NULL,
    "open"                      bigserial NOT NULL,
    "low"                       bigserial NOT NULL,
    "high"                      bigserial NOT NULL,
    "close"                     bigserial NOT NULL,
    "volume"                    bigserial NOT NULL,
    "turnover"                  bigserial NOT NULL,
    "timestamp"                 datetime NOT NULL
);

-- real time data
CREATE TABLE 24_hour_trade_data (
    "id"                        bigserial PRIMARY KEY,
    "order_book_config_pubkey"  bytea NOT NULL REFERENCES order_book_config_table (pubkey_id),
    "order_type"                order_type NOT NULL,
    "last_price"                bigserial NOT NULL,
    "avg_price"                 bigserial NOT NULL,
    "amount"                    bigserial NOT NULL,
    "turnover"                  bigserial NOT NULL,
    "timestamp"                 bigserial NOT NULL,
    "slot"                      bigserial NOT NULL
);

-- get order positions by order book config pubkey
WITH s AS (
    SELECT * FROM order_book_config_table AS obc
    WHERE obc.pubkey_id == ?
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

    FROM order_position_config_table AS opc
    JOIN order_position_table AS op ON op.order_position_config_pubkey == opc.pubkey_id,
    WHERE opc.order_book_config_pubkey == ?
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
FROM s


-- get orber book config list
SELECT * FROM order_book_config_table


-- get market order history by order book config pubkey
SELECT * FROM market_order_histry as m
WHERE m.order_book_config_pubkey == ? AND interval == ?
ORDER BY m.timestamp ASC


-- insert order book config
CREATE TABLE order_book_config_table (
    "pubkey_id"                     bytea PRIMARY KEY,
    "token_mint_a"                  bytea NOT NULL, 
    "token_mint_b"                  bytea NOT NULL, 
    "token_program_a"               bytea NOT NULL, 
    "token_program_b"               bytea NOT NULL, 
    "sell_market_pointer_pubkey"    bytea NOT NULL, 
    "buy_market_pointer_pubkey"     bytea NOT NULL, 
    "token_mint_a_decimal"          smallint NOT NULL,
    "token_mint_b_decimal"          smallint NOT NULL,
    "token_mint_a_symbol"           varchar(5) NOT NULL,
    "token_mint_b_symbol"           varchar(5) NOT NULL,
    "is_reverse"                    boolean NOT NULL
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);

-- delete order book config
DELETE FROM order_book_config_table
WHERE pubkey_id == ?

-- insert order_position_config
INSERT INTO order_position_config_table (
    "pubkey_id",
    "order_book_config_pubkey",
    "market_maker_pubkye",
    "vault_a_pubkey",
    "vault_b_pubkey",
    "nonce",
    "reference"
) VALUES (?, ?, ?, ?, ?, ?, ?);

-- update order_position_config
UPDATE order_position_config_table SET "nonce" = ?, "reference" = ?
WHERE pubkey_id = ?

-- delete order_position_config
DELETE FROM order_position_config_table
WHERE pubkey_id == ?

-- insert order position
CREATE TABLE order_position_table (
    "pubkey_id",
    "order_type",
    "price",
    "size",
    "is_available",
    "next_order_position_pubkey",
    "order_position_config_pubkey",
    "slot",
    "timestamp"
) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?);

-- update order position
UPDATE order_position_table SET "is_available" = ?, "size" = ?
WHERE pubkey_id = ?

-- delete order position
DELETE FROM order_position_table
WHERE pubkey_id == ?

-- insert 24 hour trade data
CREATE TABLE 24_hour_trade_data (
    "order_book_config_pubkey",
    "order_type",
    "last_price",
    "avg_price",
    "amount",
    "turnover",
    "timestamp",
    "slot"
) VALUES(?, ?, ?, ?, ?, ?, ?, ?);

-- delete 24 hour trade data
DELETE FROM 24_hour_trade_data as t
WHERE t.timestamp <= ?

-- insert market order trade history
CREATE TABLE market_order_histry (
    "order_book_config_pubkey",
    "interval",
    "open",
    "low",
    "high",
    "close",
    "volume",
    "turnover",
    "timestamp"
) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?);

-- one thing left to do, pubkey format in json sould be a 32 byte array