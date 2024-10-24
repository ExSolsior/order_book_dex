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
        'BqN7dPo4LheezCRC2kSX5PEyXBRNswvBzLzH7P5w2PWK',
        '84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun',
        'HTAbX8zePCdDJJoPf2tf95RvExJ99wtqgGwnnXiLZUtz',
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        'HioB7cBHwyFMjeXee13ajygWHNiyk1JWm1og7sfmqbiA',
        'F7UbiLGGqrihPXiJmQoSjerC2uFD7Pj4qVHpSWH7FB7o',
        6, 8,
        'BTC',
        'USDC',
        'BTC/USDC',
        'false',
    ),

    (
        'AX1bxytJSXyjDpzc2YpYDyNxkS3FmT2HibAfSF4MsRnA',
        '84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun',
        'FJnoYmBuTkgsbXpNKCLm4WwnPCZv7BfdKw5QrdtsNq9c',
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        '93rZYhxGW46hKSepL4BK5QuCDeW5hWjV6bAnBBgZaHMB',
        'EG7uGBo7ob4PLJzwutUB9kUL6wMdKVwbjs6DTG8h2sYg',
        6, 9,
        'USDC',
        'CHRONO',
        'CHRONO/USDC',
        'false',
    ),

    (
        'BRgmdPzrzqf5hwDyMApeU9KyH7CtmL9Ah2kkFkLNVX5P',
        '84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun',
        '9mR2ij7R6eZgf8GFs9SmCycuLpSMLzkt52qmGqiDn9qP',
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        'GrLZGvrgdZ3qHPY22pfhfNobsTuMBHi2t4m2C8BV132W',
        '4Z1V2g3jhSmbMffdCsNiftWDdTgB71TL5ZuWvNL78hBe',
        6, 9,
        'USDC',
        'SAM',
        'SAM/USDC',
        'false',
    ),

    (
        'BfDBofHfN3CUt2dnSeJfqM8JewDf7LycXfCAHtPzMvGA',
        '4rHKMSrDnZEwFa9fV2xzgjMGyj5oNDrX9Njwc32Kghc4',
        '84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun',
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        'FZzmpbMkx1w8U26JpqsuEQhkvZBCJnsmXjUPcXd4AKXk',
        '9bQMvtXZwBwcXPJtNnGqCfrSmLPB4AXjUisq4sgEutw6',
        9, 6,
        'RINSE',
        'USDC',
        'RINSE/USDC',
        'true',
    ),

    (
        '8zc43HPcFESPK3CvpHvSoSB2gfr6tNhgbiF9mYnLADZ3',
        '5yVazF5qf35Y4ppeeKP9D74L3mLWSEJJXhcTweF4uaGG',
        '84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun',
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        '6TjroP2jvNntpVVCBLQcRRzuTp7nh6HtUrpaD45NRSp5',
        '8swSq1KLeYXKVMvyPdWS2aXJP1zzGe7wSLo8gLMG3GKo',
        9, 6,
        'MISTY',
        'USDC',
        'MISTY/USDC',
        'true',
    ),

    (
        '562RPkZ1PaimxMRmESn63yLvwQycnAZGXA8Kp3iJHJSu',
        '84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun',
        'ErT9aiLJauBvRBb8Epf3mgAuGVmCqKmNdRWPwscLp7ej',
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        '91ecJFhe9xRn1dD7HkYBqFRtoFSir5yqx6TA3v4EYpQ6',
        'DkCeE7SaRBMLXA4xC5EhmNTJA4bVhyJvWHRvumXKe9NJ',
        6, 9,
        'USDC',
        'MUTINY',
        'MUTINY/USDC',
        'false',
    ),

    (
        'AtAtUaptquv5Nrw5wmngiL258oA9GkfXQ2rrkb18Yz85',
        '84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun',
        '9GUVRmud5UeAwtrg9V3bVsXpKoxu6gKfHjnWoKWX5wKW',
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        '6RpaJDaDbo9iyxKGybohCKyEeYgQyMbkCEqWG1gtiHng',
        '7AyxQtYXgheJdQV36cNS9CrEuqsHr3JGWoyg8PS1swby',
        6, 4,
        'USDC',
        'SOON',
        'SOON/USDC',
        'false',
    ),

    (
        'Cs4fZzrzQAuDeukc9rHjBcEoHMfGmCmJqXC5AgqMpDFx',
        'FJnoYmBuTkgsbXpNKCLm4WwnPCZv7BfdKw5QrdtsNq9c',
        'HTAbX8zePCdDJJoPf2tf95RvExJ99wtqgGwnnXiLZUtz',
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        '7sucQD63KUoiuJuwh53t4UvSntK76bv8gj9KeadwrFKQ',
        'HQs9h2s2S1TxRL8SUkVr4AQFw1YyhW3ovtdoU1Fxsoeq',
        9, 8,
        'CHRONO',
        'BTC',
        'CHRONO/BTC',
        'true',
    ),

    (
        'H1qCwypkThni55xR3eK5FiV6AB5oCt22ow5jZTifu3KS',
        '9mR2ij7R6eZgf8GFs9SmCycuLpSMLzkt52qmGqiDn9qP',
        'HTAbX8zePCdDJJoPf2tf95RvExJ99wtqgGwnnXiLZUtz',
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        'BovsHKb9arQQux5zkhkjvCVzYBRH5YmHTTM41vZvx7fa',
        '7qENrxH8Zp4BqamqHujgEArxejgfuDuiiBi6G9UmF315',
        9, 8,
        'SAM',
        'BTC',
        'SAM/BTC',
        'true',
    ),

    (
        'AtCF41RSb53wrZdv7j4FDdYgF6gJZMNzJwwoPwUHeZTK',
        '4rHKMSrDnZEwFa9fV2xzgjMGyj5oNDrX9Njwc32Kghc4',
        'HTAbX8zePCdDJJoPf2tf95RvExJ99wtqgGwnnXiLZUtz',
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        '6hqJL31AX6WgKi3KAfWHFfwsfmmdNYyQNFAA95eZGQWR',
        '8yV65uWURsQn7SqWjdL51W2bowSQCskdNTY25NzDknno',
        9, 8,
        'RINSE',
        'BTC',
        'RINSE/BTC',
        'true',
    ),

    (
        '2zHHxRFegDP5aYyhFGYT6CxRHYfJHErbGEGcnP6BSuu6',
        '5yVazF5qf35Y4ppeeKP9D74L3mLWSEJJXhcTweF4uaGG',
        'HTAbX8zePCdDJJoPf2tf95RvExJ99wtqgGwnnXiLZUtz',
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        'HEr2gAMhzvAtyXkxZsf94tHeNeDJUgTHw87DZh2wsnRM',
        'HQrwbj4iMnCxjpvZPeWvduH8GYrwQ3ha1dBgDWm8BaC',
        9, 8,
        'MISTY',
        'BTC',
        'MISTY/BTC',
        'true',
    ),

    (
        '9ap51HYH5sHMSaPMVRq8QQXAWJzfbheQCnXUFVnGt6K6',
        'ErT9aiLJauBvRBb8Epf3mgAuGVmCqKmNdRWPwscLp7ej',
        'HTAbX8zePCdDJJoPf2tf95RvExJ99wtqgGwnnXiLZUtz',
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        'GCATJrvH2DmAntmRcJJ2Y8RPBAjAc9m3a2Qp9WS3p1qS',
        '7PisLjYuxqDzhMJzPEzQCgCshWRKnKAMKbbP2jdq3bPQ',
        9, 8,
        'MUTINY,'
        'BTC',
        'MUTINY/BTC,'
        'true',
    ),

    (
        '7apmtkt4NQZrXLRNQrLsLrvHgab61EzdBnmyaVbPv6NT',
        '9GUVRmud5UeAwtrg9V3bVsXpKoxu6gKfHjnWoKWX5wKW',
        'HTAbX8zePCdDJJoPf2tf95RvExJ99wtqgGwnnXiLZUtz',
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        'AD76GtF4Xz5uswaanQDu8ZSFkBKiVexZ5ksWgree2Kik',
        'DkgoD1osWGoKTxUHWAXuvA4V8BPHxMpRfRPG16DxN4VF',
        4, 8,
        'SOON',
        'BTC',
        'SOON/BTC',
        'true',
    ),

    (
        '4eXZxg6fpzvgFRLXPBE6WvcQ7WQxADzZRvWAuip3aso6',
        '9mR2ij7R6eZgf8GFs9SmCycuLpSMLzkt52qmGqiDn9qP',
        'FJnoYmBuTkgsbXpNKCLm4WwnPCZv7BfdKw5QrdtsNq9c',
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        'Fg6MKfoZJAT2C8JgAACEyPq1qd72JH8ytkTPoSaDeuU9',
        '29SVzqxNW72ZqdC3rBWoLHgkY3sJLsah6uuxdjJLVrk1',
        9, 9,
        'SAM',
        'CHRONO',
        'SAM/CHRONO',
        'true',
    ),

    (
        'HugxcH6t1n6b4ngEEPnpnkDBau1bRzRSUsWzjnh5UMuS',
        '4rHKMSrDnZEwFa9fV2xzgjMGyj5oNDrX9Njwc32Kghc4',
        'FJnoYmBuTkgsbXpNKCLm4WwnPCZv7BfdKw5QrdtsNq9c',
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        'DDdUv9YLVGWDHZ5qHQmgbvBKKWozXsrjyiquPS6P9fwz',
        '29su29KuoA7vgyy6VfdthxPTeLfZ8rxuBVPoc8A4mYaS',
        9, 9,
        'RINSE',
        'CHRONO',
        'RINSE/CHRONO',
        'true',
    ),

    (
        'AewAzcavuon5CYiDajmUaQu5YZfra33DmihW2cD6BFd6',
        '5yVazF5qf35Y4ppeeKP9D74L3mLWSEJJXhcTweF4uaGG',
        'FJnoYmBuTkgsbXpNKCLm4WwnPCZv7BfdKw5QrdtsNq9c',
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        '6MBsgPH3UNX4CPTbUkchZNUramxnLzEW2VPgrZ3Fjf2W',
        '5VtN8kQWL1bZ1s4rSP6SqC5N24ZRgQAP7emDXkEHXj5P',
        9, 9,
        'MISTY',
        'CHRONO',
        'MISTY/CHRONO',
        'true',
    ),

    (
        'BB78B7KR3F4X5EWEtXshNJBMEJR1YTNnaYGfNcNovkfC',
        'ErT9aiLJauBvRBb8Epf3mgAuGVmCqKmNdRWPwscLp7ej',
        'FJnoYmBuTkgsbXpNKCLm4WwnPCZv7BfdKw5QrdtsNq9c',
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        '7sTeGFFXzFrAux2SvH7hibwakLNu6dwrLVjbcbYwrpRf',
        '4g3DoLpHx15E7BLgQqENJ6WP3RqFStPPiGvde8X4VzTi',
        9, 9,
        'MUTINY',
        'CHRONO',
        'MUTINY/CHRONO',
        'true',
    ),

    (
        'Gsa3PBumYDsSSmnn9VmXmNwkKMpLwHyTff4D44GckaBR',
        '9GUVRmud5UeAwtrg9V3bVsXpKoxu6gKfHjnWoKWX5wKW',
        'FJnoYmBuTkgsbXpNKCLm4WwnPCZv7BfdKw5QrdtsNq9c',
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        'DaAbLDsXPfwZ352KVMW8mhN1J7F2fep2zDVZiuY6zyjg',
        '3UNrBjKab3PoTFZR6qLbGb5EN5cb7rxcbvZk2bETsFVS',
        4, 9,
        'SOON',
        'CHRONO',
        'SOON/CHRONO',
        'true',
    );


    INSERT INTO order_position_config (
    "pubkey_id",
    "order_book_config_pubkey",
    "market_maker_pubkey",
    "vault_a_pubkey",
    "vault_b_pubkey",
    "nonce",
    "reference"
) VALUES (
    '49wBdBzzw9eMre1wT27TD1b8hgW9x9tCWFtvAUmLohtp', 
    'BqN7dPo4LheezCRC2kSX5PEyXBRNswvBzLzH7P5w2PWK', 
    '3r94vqjXgw8NTuWAf2xXVJZFNF3NMpogHGzukR3UDKGe', 
    'DMWSPLsKwJrU3a1pNJxWZ3Gb6JykPFSKWtxVR8svhqrB', 
    'H2NyxBpLBXxjuGMurB9kLJbePaghhEqDenXyptWJaUFe', 
    0, 
    0
),

(
    '3yJALi5ZMjXnNQvFyPE2sMKjPNYZtZ8jNBxajcGxWp2w', 
    'BqN7dPo4LheezCRC2kSX5PEyXBRNswvBzLzH7P5w2PWK', 
    'Fg6bTVyTc53uGvUyctgRMaRXuKukM28KvSDXRjfQ3Uru', 
    'DfBXUGPumZCLMRqAdZbTLND7jB9t2k1cxQbVAh1RMDFz', 
    '3DYaNhZ11fcZrBXCorqoY51XXHzT7MjWPMmge9ibYsQd', 
    0, 
    0
),

(
    'C9zVweJ1kCnzVeGpqBVpBSxZYY5Khsec7TqCXNmxcQMs', 
    'BqN7dPo4LheezCRC2kSX5PEyXBRNswvBzLzH7P5w2PWK', 
    'CPbvhfoLgnUG1uSVBjSYXVeLVqyNyReQoQwnbA6SxotY', 
    'GFXSVUE696WL6LkiRin5BR6jgpSSh7t85dcHnmVUHqJe', 
    '9tJJwpjpgZsghxKYUCsxJXySNkBkLQDahrSHA8RTropC', 
    0, 
    0
),

(
    '2FqYTjMdGDV9mvs4x6F47tJRkLBtnbd7fbcb35kDzXAs', 
    'BqN7dPo4LheezCRC2kSX5PEyXBRNswvBzLzH7P5w2PWK', 
    '9usz5QxXLMLknDPSMgWbAR7C9boMVmmcUiXB2hkV32wf', 
    '2dnp89qgZRs4d8WV3nQBWhxuUS13cAoYQatsaU6Sk5mQ', 
    'ESz3vtYhpRcBTubk7PiFmUqXCqXbTL7SZnP5eZPdump7', 
    0, 
    0
),

(
    'GSaCLDN6XfmiYQ5Qi8YobZJJpmWn1ah2YJtqQGrLqTuN', 
    'BqN7dPo4LheezCRC2kSX5PEyXBRNswvBzLzH7P5w2PWK', 
    'UqgxjP8LZtpdQPpdx9nzhMysGRpRsUuCXiwsDDJiEbV', 
    '7hQQMtS8Az3iGRUWqU25XwnH1N4hMH24zcPMa5itnwy9', 
    '9HPg2WGyJvp8GJZRQKb2o8fE7hv88CH2up9bbPMCoakc', 
    0, 
    0
),

(
    'BWwFGMJCCVp8Ru5JQxY4kHd31WUMGtSeMXZYLVtxgcDf', 
    'BqN7dPo4LheezCRC2kSX5PEyXBRNswvBzLzH7P5w2PWK', 
    'Day5aAzdktXLdReX7ud7gD5TGX9BtKQhtw6SbzC44Y1N', 
    'Hnjv6NHPA8A3DmaTrCaASddw6qAjfsYJJMjeJkdDJF8t', 
    'Dqfmt22vH2v7V4AzibUsZBsxHLaQW62Y6KBgXy8X4qUy', 
    0, 
    0
)

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
    



INSERT INTO order_position (
    "pubkey_id",
    "order_type" ,
    "price",
    "size",
    "is_available",
    "next_order_position_pubkey",
    "order_position_config_pubkey",
    "slot",
    "timestamp"
);


-- should work but can think about improvements
WITH chart AS (
    SELECT * 
    FROM real_time_trade_data AS td
    WHERE current <= td.timestamp
    OR NOT td.include;

), open_price AS (
    SELECT 
        MIN("timestamp") AS "timestamp",
        order_book_config_pubkey
        price
    FROM chart
    GROUP BY order_book_config_pubkey

), close_price AS (
    SELECT 
        MAX("timestamp") AS "timestamp",
        order_book_config_pubkey
        price
    FROM chart
    GROUP BY order_book_config_pubkey

)

SELECT 
    chart.order_book_config_pubkey AS "pubkey_id",
    "1m" AS "interval",
    o.price  AS "open",
    MAX(chart.price) as "high",
    MIN(chart.price) as "low",
    c.price  AS "close",
    sum(chart.amount) AS "volume",
    sum(chart.price) AS "turnover",
    current AS "timestamp",
FROM chart;
JOIN open_price AS o ON o.order_book_config_pubkey = chart.order_book_config_pubkey
JOIN close_price AS c ON o.order_book_config_pubkey = chart.order_book_config_pubkey
GROUP BY chart.order_book_config_pubkey;




DELETE FROM real_time_trade_data  AS td
WHERE td.timestamp - current >= 86400;





INSERT INTO real_time_trade_data (
    "order_book_config_pubkey",
    "order_type",
    "last_price",
    "avg_price",
    "amount",
    "turnover",
    "timestamp",
    "slot"
) values

(
    '2zHHxRFegDP5aYyhFGYT6CxRHYfJHErbGEGcnP6BSuu6',
    'buy', 1000, 1000, 100, 1000 * 100,
    1431648055, 0
),

(
    '2zHHxRFegDP5aYyhFGYT6CxRHYfJHErbGEGcnP6BSuu6',
    'buy', 1010, 0, 50, 1010 * 50,
    1431648060, 0
),

(
    '2zHHxRFegDP5aYyhFGYT6CxRHYfJHErbGEGcnP6BSuu6',
    'buy', 1020, 0, 20, 1020 * 20,
    1431648050, 0
),

(
    '2zHHxRFegDP5aYyhFGYT6CxRHYfJHErbGEGcnP6BSuu6',
    'buy', 1030, 0, 40, 1030 * 40,
    1431647985, 0
),

(
    '2zHHxRFegDP5aYyhFGYT6CxRHYfJHErbGEGcnP6BSuu6',
    'sell', 900, 0, 100, 900 * 100,
    1431647999, 0
),

(
    '2zHHxRFegDP5aYyhFGYT6CxRHYfJHErbGEGcnP6BSuu6',
    'sell', 850, 0, 500, 850 * 500,
    1431648020, 0
),

(
    '2zHHxRFegDP5aYyhFGYT6CxRHYfJHErbGEGcnP6BSuu6',
    'sell', 1000, 0, 200, 1000 * 200,
    1431648040, 0
),

(
    '2zHHxRFegDP5aYyhFGYT6CxRHYfJHErbGEGcnP6BSuu6',
    'sell', 920, 0, 10, 920 * 10,
    1431648045, 0
),

(
    '4eXZxg6fpzvgFRLXPBE6WvcQ7WQxADzZRvWAuip3aso6',
    'buy', 1000, 1000, 100, 1000 * 100,
    1431648055, 0
),

(
    '4eXZxg6fpzvgFRLXPBE6WvcQ7WQxADzZRvWAuip3aso6',
    'buy', 1010, 0, 50, 1010 * 50,
    1431648060, 0
),

(
    '4eXZxg6fpzvgFRLXPBE6WvcQ7WQxADzZRvWAuip3aso6',
    'buy', 1020, 0, 20, 1020 * 20,
    1431648050, 0
),

(
    '4eXZxg6fpzvgFRLXPBE6WvcQ7WQxADzZRvWAuip3aso6',
    'buy', 1030, 0, 40, 1030 * 40,
    1431647985, 0
),

(
    '4eXZxg6fpzvgFRLXPBE6WvcQ7WQxADzZRvWAuip3aso6',
    'sell', 900, 0, 100, 900 * 100,
    1431647999, 0
),

(
    '4eXZxg6fpzvgFRLXPBE6WvcQ7WQxADzZRvWAuip3aso6',
    'sell', 850, 0, 500, 850 * 500,
    1431648020, 0
),

(
    '4eXZxg6fpzvgFRLXPBE6WvcQ7WQxADzZRvWAuip3aso6',
    'sell', 1000, 0, 200, 1000 * 200,
    1431648040, 0
),

(
    '4eXZxg6fpzvgFRLXPBE6WvcQ7WQxADzZRvWAuip3aso6',
    'sell', 920, 0, 10, 920 * 10,
    1431648045, 0
)