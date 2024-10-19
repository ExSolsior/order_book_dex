CREATE TYPE order_type as ENUM (
    'buy',
    'sell',
    'bid',
    'ask'
);

CREATE TYPE interval as ENUM (
    '1m', '2m', '5m', '10m', '15m', 
    '20m', '30m', '1h', '2h', '3h', 
    '4h', '6h', '8h', '12h', 'D', 
    '2D', '3D', 'W', '2W', '3W',  
    'M', '2M', '3M', '4M', '6M',
    '12M'
)

CREATE TABLE IF NOT EXISTS order_book_config_table (
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

CREATE TABLE IF NOT EXISTS order_position_config_table (
    "pubkey_id"                 bytea PRIMARY KEY,
    "order_book_config_pubkey"  bytea NOT NULL REFERENCES order_book_config_table (pubkey_id),
    "market_maker_pubkye"       bytea NOT NULL,
    "vault_a_pubkey"            bytea NOT NULL,
    "vault_b_pubkey"            bytea NOT NULL,
    "nonce"                     bigserial,
    "reference"                 bigserial
);

CREATE TABLE IF NOT EXISTS order_position_table (
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

CREATE TABLE IF NOT EXISTS market_order_histry (
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
CREATE TABLE IF NOT EXISTS 24_hour_trade_data (
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
    "market_maker_pubkey",
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
    "slot",
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
) VALUES (
    '6KXbttSdiSf73sgPY3A7qdFGfHyA1NBW5ffHHDyNbhRD',
    '6KXbttSdiSf73sgPY3A7qdFGfHyA1NBW5ffHHDyNbhRD',
    '6KXbttSdiSf73sgPY3A7qdFGfHyA1NBW5ffHHDyNbhRD',
    '6KXbttSdiSf73sgPY3A7qdFGfHyA1NBW5ffHHDyNbhRD',
    '6KXbttSdiSf73sgPY3A7qdFGfHyA1NBW5ffHHDyNbhRD',
    '6KXbttSdiSf73sgPY3A7qdFGfHyA1NBW5ffHHDyNbhRD',
    '6KXbttSdiSf73sgPY3A7qdFGfHyA1NBW5ffHHDyNbhRD',
    9, 9, 'abc', 'btc', 'abc/btc', 'false'
);

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
) VALUES (
    '88FbttSdiSf73sgPY3A7qdFGfHyA1NBW5ffHHDyNbcF3',
    '88FbttSdiSf73sgPY3A7qdFGfHyA1NBW5ffHHDyNbcF3',
    '88FbttSdiSf73sgPY3A7qdFGfHyA1NBW5ffHHDyNbcF3',
    '88FbttSdiSf73sgPY3A7qdFGfHyA1NBW5ffHHDyNbcF3',
    '88FbttSdiSf73sgPY3A7qdFGfHyA1NBW5ffHHDyNbcF3',
    '88FbttSdiSf73sgPY3A7qdFGfHyA1NBW5ffHHDyNbcF3',
    '88FbttSdiSf73sgPY3A7qdFGfHyA1NBW5ffHHDyNbcF3',
    9, 6, 'DDT', 'btc', 'ddt/btc', 'false'
);

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
    ) VALUES (
        '45XbttSdiSf73sgPY3A7qdFGfHyA1NBW5ffHHDyNbhAC',
        '45XbttSdiSf73sgPY3A7qdFGfHyA1NBW5ffHHDyNbhAC',
        '45XbttSdiSf73sgPY3A7qdFGfHyA1NBW5ffHHDyNbhAC',
        '45XbttSdiSf73sgPY3A7qdFGfHyA1NBW5ffHHDyNbhAC',
        '45XbttSdiSf73sgPY3A7qdFGfHyA1NBW5ffHHDyNbhAC',
        '45XbttSdiSf73sgPY3A7qdFGfHyA1NBW5ffHHDyNbhAC',
        '45XbttSdiSf73sgPY3A7qdFGfHyA1NBW5ffHHDyNbhAC',
        8, 9, 'USDC', 'btc', 'usdc/btc', 'false'
    );




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
) VALUES (
    '88FbttSdiSf73sgPY3A7qdFGfHyA1NBW5ffHHDyNbcF3', 
    '1m', 
    13, 
    10, 
    11, 
    12, 
    13, 
    8, 
    9
);

SET intervalstyle = iso_8601;
SELECT * FROM market_order_history as m
WHERE m.order_book_config_pubkey = '88FbttSdiSf73sgPY3A7qdFGfHyA1NBW5ffHHDyNbcF3'
AND m.interval = '1m';

AND interval = $2
ORDER BY m.timestamp DESC
LIMIT $3 
OFFSET $4;




INSERT INTO order_position_config (
    "pubkey_id",
    "order_book_config_pubkey",
    "market_maker_pubkey",
    "vault_a_pubkey",
    "vault_b_pubkey",
    "nonce",
    "reference"
) VALUES (
    '88FbttSdiSf73sgPY3A7qdFGfHyA1NBW5ffHHDyNbcF3', 
    '88FbttSdiSf73sgPY3A7qdFGfHyA1NBW5ffHHDyNbcF3', 
    '88FbttSdiSf73sgPY3A7qdFGfHyA1NBW5ffHHDyNbcF3', 
    '88FbttSdiSf73sgPY3A7qdFGfHyA1NBW5ffHHDyNbcF3', 
    '88FbttSdiSf73sgPY3A7qdFGfHyA1NBW5ffHHDyNbcF3', 
    0, 
    0
);

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
) VALUES (
    '8gFbttSdiSf73sgPY3A7qdFGfHyA1NBW5ffHHDyNbcF3', 
    'ask', 
    100, 
    100, 
    'true',
    NULL,
    '88FbttSdiSf73sgPY3A7qdFGfHyA1NBW5ffHHDyNbcF3',
    0, 
    0
);

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
) VALUES (
    '1gFbttSdiSf73sgPY3A7qdFGfHyA1NBW5ffHHDyNbcF3', 
    'ask', 
    100, 
    100, 
    'true',
    NULL,
    '88FbttSdiSf73sgPY3A7qdFGfHyA1NBW5ffHHDyNbcF3',
    0, 
    0
);

WITH s AS (
    SELECT * FROM order_book_config AS obc
    WHERE obc.pubkey_id = '88FbttSdiSf73sgPY3A7qdFGfHyA1NBW5ffHHDyNbcF3'
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
    JOIN s ON s.pubkey_id = '88FbttSdiSf73sgPY3A7qdFGfHyA1NBW5ffHHDyNbcF3'
    WHERE opc.order_book_config_pubkey = '88FbttSdiSf73sgPY3A7qdFGfHyA1NBW5ffHHDyNbcF3'
    ORDER BY op.price ASC

), j AS (
    SELECT
        '88FbttSdiSf73sgPY3A7qdFGfHyA1NBW5ffHHDyNbcF3' AS "pubkey_id",
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
    JOIN s ON s.pubkey_id = '88FbttSdiSf73sgPY3A7qdFGfHyA1NBW5ffHHDyNbcF3'
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


INSERT INTO order_position_config (
    "pubkey_id",
    "order_book_config_pubkey",
    "market_maker_pubkey",
    "vault_a_pubkey",
    "vault_b_pubkey",
    "nonce",
    "reference"
) VALUES (
    '88FbttSdiSf73sgPY3A7qdFGfHyA1NBW5ffHHDyNbcF3', 
    '88FbttSdiSf73sgPY3A7qdFGfHyA1NBW5ffHHDyNbcF3', 
    '88FbttSdiSf73sgPY3A7qdFGfHyA1NBW5ffHHDyNbcF3', 
    '88FbttSdiSf73sgPY3A7qdFGfHyA1NBW5ffHHDyNbcF3', 
    '88FbttSdiSf73sgPY3A7qdFGfHyA1NBW5ffHHDyNbcF3', 
    0, 
    0
);


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
    ) VALUES 

    (
        'F8X9syRb9HycoJUmvpopjdyiiUSaScdGXCeSwSuvrj3z'
        'YSMcxbaK3SXax6CRCYpsDhGhPRdaBgrAtFoCY7QFovf'
        '84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun'
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
        'HioB7cBHwyFMjeXee13ajygWHNiyk1JWm1og7sfmqbiA'
        'F7UbiLGGqrihPXiJmQoSjerC2uFD7Pj4qVHpSWH7FB7o'
        8, 6,
        'BTC'
        'USDC'
        'BTC/USDC'
        'false'
    ),

    (
        'GmK5PpkDizrejQ1eZUvXqVw2pgtDqDSPmTBhZKF4ah5z'
        '84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun'
        'FJnoYmBuTkgsbXpNKCLm4WwnPCZv7BfdKw5QrdtsNq9c'
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
        '93rZYhxGW46hKSepL4BK5QuCDeW5hWjV6bAnBBgZaHMB'
        'EG7uGBo7ob4PLJzwutUB9kUL6wMdKVwbjs6DTG8h2sYg'
        6, 9,
        'USDC'
        'CHRONO'
        'CHRONO/USDC'
        'false'
    ),

    (
        '4ocHFR6EB2vmKshhyPH5nezXTJp7otMwwqgfCnSu2BJr'
        '84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun'
        '9mR2ij7R6eZgf8GFs9SmCycuLpSMLzkt52qmGqiDn9qP'
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
        'GrLZGvrgdZ3qHPY22pfhfNobsTuMBHi2t4m2C8BV132W'
        '4Z1V2g3jhSmbMffdCsNiftWDdTgB71TL5ZuWvNL78hBe'
        6, 9,
        'USDC'
        'SAM'
        'SAM/USDC'
        'false'
    ),

    (
        '4QevZFgFaKfXRr8JWqNM6KnDE4Euy4m6j8N5WRK2QtcM'
        '4rHKMSrDnZEwFa9fV2xzgjMGyj5oNDrX9Njwc32Kghc4'
        '84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun'
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
        'FZzmpbMkx1w8U26JpqsuEQhkvZBCJnsmXjUPcXd4AKXk'
        '9bQMvtXZwBwcXPJtNnGqCfrSmLPB4AXjUisq4sgEutw6'
        9, 6,
        'RINSE'
        'USDC'
        'RINSE/USDC'
        'true'
    ),

    (
        '3QCyPmNfdWUyLkwNafwNdv8Wqu5QB8eAgWPCRm5bfGEz'
        '5yVazF5qf35Y4ppeeKP9D74L3mLWSEJJXhcTweF4uaGG'
        '84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun'
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
        '6TjroP2jvNntpVVCBLQcRRzuTp7nh6HtUrpaD45NRSp5'
        '8swSq1KLeYXKVMvyPdWS2aXJP1zzGe7wSLo8gLMG3GKo'
        9, 6,
        'MISTY'
        'USDC'
        'MISTY/USDC'
        'true'
    ),

    (
        '8APUse7WwB4UrPMWZYvns6Mqcbze56sbuQ7VDfkhyTFh'
        '84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun'
        'ErT9aiLJauBvRBb8Epf3mgAuGVmCqKmNdRWPwscLp7ej'
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
        '91ecJFhe9xRn1dD7HkYBqFRtoFSir5yqx6TA3v4EYpQ6'
        'DkCeE7SaRBMLXA4xC5EhmNTJA4bVhyJvWHRvumXKe9NJ'
        6, 9,
        'USDC'
        'MUTINY'
        'MUTINY/USDC'
        'false'
    ),

    (
        '79qykQ5t3teAayoRPazNZ8DWRUShSBjKTZq9GWDkfuSZ'
        '84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun'
        '9GUVRmud5UeAwtrg9V3bVsXpKoxu6gKfHjnWoKWX5wKW'
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
        '6RpaJDaDbo9iyxKGybohCKyEeYgQyMbkCEqWG1gtiHng'
        '7AyxQtYXgheJdQV36cNS9CrEuqsHr3JGWoyg8PS1swby'
        6, 4,
        'USDC'
        'SOON'
        'SOON/USDC'
        'false'
    ),
-- POINT
    (
        '7hKepVqbM7n1cnJTNWizQs8KYWuZ1xD2wjNnPJLebK6i'
        'FJnoYmBuTkgsbXpNKCLm4WwnPCZv7BfdKw5QrdtsNq9c'
        'YSMcxbaK3SXax6CRCYpsDhGhPRdaBgrAtFoCY7QFovf'
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
        '7sucQD63KUoiuJuwh53t4UvSntK76bv8gj9KeadwrFKQ'
        'HQs9h2s2S1TxRL8SUkVr4AQFw1YyhW3ovtdoU1Fxsoeq'
        9, 8,
        'CHRONO'
        'BTC'
        'CHRONO/BTC'
        'false'
    ),

    (
        '4EzfBzn173YJ8671akDngWoXL5UXerfYQauYbZ9qusbZ'
        '9mR2ij7R6eZgf8GFs9SmCycuLpSMLzkt52qmGqiDn9qP'
        'YSMcxbaK3SXax6CRCYpsDhGhPRdaBgrAtFoCY7QFovf'
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
        'BovsHKb9arQQux5zkhkjvCVzYBRH5YmHTTM41vZvx7fa'
        '7qENrxH8Zp4BqamqHujgEArxejgfuDuiiBi6G9UmF315'
        9, 8,
        'SAM'
        'BTC'
        'SAM/BTC'
        'false'
    ),

    (
        '9AhsCV1L6x2iptY9MAVNfHDvav4XXTTrguo4zmZtQAXS'
        '4rHKMSrDnZEwFa9fV2xzgjMGyj5oNDrX9Njwc32Kghc4'
        'YSMcxbaK3SXax6CRCYpsDhGhPRdaBgrAtFoCY7QFovf'
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
        '6hqJL31AX6WgKi3KAfWHFfwsfmmdNYyQNFAA95eZGQWR'
        '8yV65uWURsQn7SqWjdL51W2bowSQCskdNTY25NzDknno'
        9, 8,
        'RINSE'
        'BTC'
        'RINSE/BTC'
        'false'
    ),

    (
        'ESb8ReVMkNWpDMtPKxaFQB9aqEswG2KoCs8GoDihAJrj'
        '5yVazF5qf35Y4ppeeKP9D74L3mLWSEJJXhcTweF4uaGG'
        'YSMcxbaK3SXax6CRCYpsDhGhPRdaBgrAtFoCY7QFovf'
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
        'HEr2gAMhzvAtyXkxZsf94tHeNeDJUgTHw87DZh2wsnRM'
        'HQrwbj4iMnCxjpvZPeWvduH8GYrwQ3ha1dBgDWm8BaC'
        9, 8,
        'MISTY'
        'BTC'
        'MISTY/BTC'
        'false'
    ),

    (
        'CqqpDqCZMrmK5ufUSFWdYPeger77DUtHKLP8Vs3cETxd'
        'ErT9aiLJauBvRBb8Epf3mgAuGVmCqKmNdRWPwscLp7ej'
        'YSMcxbaK3SXax6CRCYpsDhGhPRdaBgrAtFoCY7QFovf'
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
        'GCATJrvH2DmAntmRcJJ2Y8RPBAjAc9m3a2Qp9WS3p1qS'
        '7PisLjYuxqDzhMJzPEzQCgCshWRKnKAMKbbP2jdq3bPQ'
        9, 8,
        'MUTINY'
        'BTC'
        'MUTINY/BTC'
        'false'
    ),

    (
        'EQRmYLvTM6kzqTSQ8jjEkifaJVDpT4hAQWUXDtGtgWow'
        '9GUVRmud5UeAwtrg9V3bVsXpKoxu6gKfHjnWoKWX5wKW'
        'YSMcxbaK3SXax6CRCYpsDhGhPRdaBgrAtFoCY7QFovf'
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
        'AD76GtF4Xz5uswaanQDu8ZSFkBKiVexZ5ksWgree2Kik'
        'DkgoD1osWGoKTxUHWAXuvA4V8BPHxMpRfRPG16DxN4VF'
        4, 8,
        'SOON'
        'BTC'
        'SOON/BTC'
        'false'
    ),

    (
        'bfYFWfA4jjH9nk6FyyNZijoujTd9jaK3T5Nb4sEqEGn'
        '9mR2ij7R6eZgf8GFs9SmCycuLpSMLzkt52qmGqiDn9qP'
        'FJnoYmBuTkgsbXpNKCLm4WwnPCZv7BfdKw5QrdtsNq9c'
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
        'Fg6MKfoZJAT2C8JgAACEyPq1qd72JH8ytkTPoSaDeuU9'
        '29SVzqxNW72ZqdC3rBWoLHgkY3sJLsah6uuxdjJLVrk1'
        9, 9,
        'SAM'
        'CHRONO'
        'SAM/CHRONO'
        'false'
    ),

    (
        'GPJHWM2PHS1qxdBrMQSaQw59mDiWQFQqiVwGGq5AU7DP'
        '4rHKMSrDnZEwFa9fV2xzgjMGyj5oNDrX9Njwc32Kghc4'
        'FJnoYmBuTkgsbXpNKCLm4WwnPCZv7BfdKw5QrdtsNq9c'
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
        'DDdUv9YLVGWDHZ5qHQmgbvBKKWozXsrjyiquPS6P9fwz'
        '29su29KuoA7vgyy6VfdthxPTeLfZ8rxuBVPoc8A4mYaS'
        9, 9,
        'RINSE'
        'CHRONO'
        'RINSE/CHRONO'
        'false'
    ),

    (
        'ECxbsZVDwwyVwUE3DubeCWQVd9G52qe9vc5dqjZqVc5Y'
        '5yVazF5qf35Y4ppeeKP9D74L3mLWSEJJXhcTweF4uaGG'
        'FJnoYmBuTkgsbXpNKCLm4WwnPCZv7BfdKw5QrdtsNq9c'
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
        '6MBsgPH3UNX4CPTbUkchZNUramxnLzEW2VPgrZ3Fjf2W'
        '5VtN8kQWL1bZ1s4rSP6SqC5N24ZRgQAP7emDXkEHXj5P'
        9, 9,
        'MISTY'
        'CHRONO'
        'MISTY/CHRONO'
        'false'
    ),

    (
        'TdYz6wrNpEeqphKCCz3eB3Ng8ceByoesQimhn69X4Jn'
        'ErT9aiLJauBvRBb8Epf3mgAuGVmCqKmNdRWPwscLp7ej'
        'FJnoYmBuTkgsbXpNKCLm4WwnPCZv7BfdKw5QrdtsNq9c'
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
        '7sTeGFFXzFrAux2SvH7hibwakLNu6dwrLVjbcbYwrpRf'
        '4g3DoLpHx15E7BLgQqENJ6WP3RqFStPPiGvde8X4VzTi'
        9, 9,
        'MUTINY'
        'CHRONO'
        'MUTINY/CHRONO'
        'false'
    ),

    (
        'Bz61dywXBsG33YcvLHexcodrCLKPYDVMSUUi58WiLNC8'
        '9GUVRmud5UeAwtrg9V3bVsXpKoxu6gKfHjnWoKWX5wKW'
        'FJnoYmBuTkgsbXpNKCLm4WwnPCZv7BfdKw5QrdtsNq9c'
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
        'DaAbLDsXPfwZ352KVMW8mhN1J7F2fep2zDVZiuY6zyjg'
        '3UNrBjKab3PoTFZR6qLbGb5EN5cb7rxcbvZk2bETsFVS'
        4, 9,
        'SOON'
        'CHRONO'
        'SOON/CHRONO'
        'false'
    );

    -- USDC
    '84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun',
    'YSMcxbaK3SXax6CRCYpsDhGhPRdaBgrAtFoCY7QFovf',

    '84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun',
    'FJnoYmBuTkgsbXpNKCLm4WwnPCZv7BfdKw5QrdtsNq9c',

    '84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun',
    '9mR2ij7R6eZgf8GFs9SmCycuLpSMLzkt52qmGqiDn9qP',

    '4rHKMSrDnZEwFa9fV2xzgjMGyj5oNDrX9Njwc32Kghc4',
    '84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun',

    '5yVazF5qf35Y4ppeeKP9D74L3mLWSEJJXhcTweF4uaGG',
    '84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun',

    '84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun',
    'ErT9aiLJauBvRBb8Epf3mgAuGVmCqKmNdRWPwscLp7ej',

    '84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun',
    '9GUVRmud5UeAwtrg9V3bVsXpKoxu6gKfHjnWoKWX5wKW',


    -- BTC
    'FJnoYmBuTkgsbXpNKCLm4WwnPCZv7BfdKw5QrdtsNq9c',
    'YSMcxbaK3SXax6CRCYpsDhGhPRdaBgrAtFoCY7QFovf',

    '9mR2ij7R6eZgf8GFs9SmCycuLpSMLzkt52qmGqiDn9qP',
    'YSMcxbaK3SXax6CRCYpsDhGhPRdaBgrAtFoCY7QFovf',

    '4rHKMSrDnZEwFa9fV2xzgjMGyj5oNDrX9Njwc32Kghc4',
    'YSMcxbaK3SXax6CRCYpsDhGhPRdaBgrAtFoCY7QFovf',

    '5yVazF5qf35Y4ppeeKP9D74L3mLWSEJJXhcTweF4uaGG',
    'YSMcxbaK3SXax6CRCYpsDhGhPRdaBgrAtFoCY7QFovf',

    'ErT9aiLJauBvRBb8Epf3mgAuGVmCqKmNdRWPwscLp7ej',
    'YSMcxbaK3SXax6CRCYpsDhGhPRdaBgrAtFoCY7QFovf',

    '9GUVRmud5UeAwtrg9V3bVsXpKoxu6gKfHjnWoKWX5wKW',
    'YSMcxbaK3SXax6CRCYpsDhGhPRdaBgrAtFoCY7QFovf',

    -- CHRONO
    '9mR2ij7R6eZgf8GFs9SmCycuLpSMLzkt52qmGqiDn9qP',
    'FJnoYmBuTkgsbXpNKCLm4WwnPCZv7BfdKw5QrdtsNq9c',

    '4rHKMSrDnZEwFa9fV2xzgjMGyj5oNDrX9Njwc32Kghc4',
    'FJnoYmBuTkgsbXpNKCLm4WwnPCZv7BfdKw5QrdtsNq9c',

    '5yVazF5qf35Y4ppeeKP9D74L3mLWSEJJXhcTweF4uaGG',
    'FJnoYmBuTkgsbXpNKCLm4WwnPCZv7BfdKw5QrdtsNq9c',

    'ErT9aiLJauBvRBb8Epf3mgAuGVmCqKmNdRWPwscLp7ej',
    'FJnoYmBuTkgsbXpNKCLm4WwnPCZv7BfdKw5QrdtsNq9c',

    '9GUVRmud5UeAwtrg9V3bVsXpKoxu6gKfHjnWoKWX5wKW',
    'FJnoYmBuTkgsbXpNKCLm4WwnPCZv7BfdKw5QrdtsNq9c',

    -- WETH
    