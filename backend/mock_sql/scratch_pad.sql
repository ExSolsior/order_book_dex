

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




-- one thing left to do, pubkey format in json sould be a 32 byte array




SET intervalstyle = iso_8601;
SELECT * FROM market_order_history as m
WHERE m.order_book_config_pubkey = '88FbttSdiSf73sgPY3A7qdFGfHyA1NBW5ffHHDyNbcF3'
AND m.interval = '1m';

AND interval = $2
ORDER BY m.timestamp DESC
LIMIT $3 
OFFSET $4;


--------------------------------------------


-----------------------------------------------
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


-----------------------------------------------------------


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
    

----------------------------------------------------------------------




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














-- create order position
-- inputs 
order_type, 
price, 
amount
signer pubkey 
order position config pubkey
order position pubkey
capital source account
-- accounts
signer                          -- from client
order_book_config               -- order book config table
order_position_config           -- from client
order_position                  -- from client
token_mint_a                    -- order book config table
token_mint_b                    -- order book config table
capital_source                  -- client should handle <- get from client
source                          -- order position config table, I think should come from client, or derived
destination                     -- order position config table, I think should come from client, or derived
token_program_a                 -- order book config table
token_program_b                 -- order book config table

-- inputs 
signer pubkey
order position confing
order position
next position pointer 
-- open order position -> will send 2 different versions to handle next position pointer
signer                          -- from client
order_book_config               -- order book config table
    -- need to check if any limit order exist, if any then set market_pointer_reader
market_pointer_reader           -- order book config table
    -- need to check if any limit order exist, if not then set the market_ponter_writer
market_pointer_writer           -- order book config table
order_position_config           -- from client
order_position                  -- from client | client should handle
prev_order_position             -- order position
next_order_position             -- order position
next_position_pointer           -- client should handle <- get from client

-- open limit order
-- need to check if any limit order exist, if not then set the market_ponter_writer


-------------------------------------------------------------------

-- this could be handled on the client side, but close limit order needs to be fetched
-- since these instructions will happen in a single transaction
-- inputs
signer                   
order_book_config              
order_position 
order_position_config
-- cancel limit order
signer                          -- from client
order_book_config               -- order book config table
    -- need figure out how to determine if reader or writer
market_pointer_reader           -- order book config table
market_pointer_writer           -- order book config table
order_position                  -- from client | client should handle
order_position_config           -- order position config table
prev_order_position             -- order position
next_order_position             -- order position

-- close limit order -> from cancel -> from market maker
signer                          -- from client
owner                           -- order position table         -> owner of position
order_book_config               -- order book config table
order_position                  -- from client | client should handle
order_position_config           -- order position config table  -> match to mint a or b
source                          -- order position               -> match to mint a or b
destination                     -- order position               -> match to mint a or b
capital_source                  -- from client                  -> match to mint a or b --> client must validate if account exist if not then send flag to create the instr
capital_destination             -- from client                  -> match to mint a or b --> client must validate if account exist if not then send flag to create the instr
token_mint_source               -- order book config table      -> match to mint a or b
token_mint_destination          -- order book config table      -> match to mint a or b
token_program_source            -- order book config table      -> match to program a or b
token_program_destination       -- order book config table      -> match to program a or b
system_program                  -- module


SELECT * FROM order_position AS o
JOIN order_position_config AS opc ON opc.pubkey_id = o.order_position_config_pubkey
JOIN order_book_config AS config ON config.pubkey_id = opc.order_book_config_pubkey
WHERE o.pubkey_id = $1 AND

WITH limit_order AS (
    SELECT
        o.pubkey_id,
        o.order_type,
        o.price,
        o.size,
        o.is_available,
        o.next_order_position_pubkey,
        o.order_position_config_pubkey,
        opc.order_book_config_pubkey,
        o.slot,
        o.timestamp
    FROM order_position AS o
    JOIN order_position_config AS opc ON opc.pubkey_id = o.order_position_config_pubkey
    WHERE o.pubkey_id = $1 OR o.next_order_position_pubkey = $1

) t AS (
    SELECT * FROM limit_order 
    JOIN order_book_config AS config ON config.pubkey_id = limit_order.order_book_config_pubkey
    WHERE o.next_order_position_pubkey = $1 OR o.pubkey_id = $1 
)

----------------------------------------

-- close limit order -> from complete -> from market taker
signer                          -- from client
owner                           -- order position table         -> owner of position
order_book_config               -- order book config table
order_position                  -- from client | client should handle
order_position_config           -- order position config table  -> match to mint a or b
source                          -- order position               -> match to mint a or b
destination                     -- order position               -> match to mint a or b
capital_source                  -- from client                  -> match to mint a or b --> client must validate if account exist if not then send flag to create the instr
capital_destination             -- from client                  -> match to mint a or b --> client must validate if account exist if not then send flag to create the instr
token_mint_source               -- order book config table      -> match to mint a or b
token_mint_destination          -- order book config table      -> match to mint a or b
token_program_source            -- order book config table      -> match to program a or b
token_program_destination       -- order book config table      -> match to program a or b
system_program                  -- module



-------------------------

SELECT * FROM real_time_trade_data
WHERE book_config = ""
ORDER BY slot DESC
LIMIT 20



               WITH trade_pair AS (
                    SELECT * FROM order_book_config AS obc
                    WHERE obc.pubkey_id = 'BqN7dPo4LheezCRC2kSX5PEyXBRNswvBzLzH7P5w2PWK'

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
                        'BqN7dPo4LheezCRC2kSX5PEyXBRNswvBzLzH7P5w2PWK' AS "pubkey_id",
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
                        'BqN7dPo4LheezCRC2kSX5PEyXBRNswvBzLzH7P5w2PWK' AS "pubkey_id",
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

                ), trade_history AS (
                    SELECT 
                        order_type,
                        last_price,
                        amount,
                        "timestamp"
                        
                    FROM real_time_trade_data
                    WHERE book_config = 'BqN7dPo4LheezCRC2kSX5PEyXBRNswvBzLzH7P5w2PWK'
                    ORDER BY slot DESC
                    LIMIT 200

                ), trade_history_agg AS (
                    SELECT
                        'BqN7dPo4LheezCRC2kSX5PEyXBRNswvBzLzH7P5w2PWK' AS book_config,
                        json_agg(
                            json_build_object(
                                'action', h.order_type,
                                'price', h.last_price,
                                'qty', h.amount,
                                'time', h.timestamp
                            )
                        ) as trades
                    FROM trade_history AS h
                    GROUP BY book_config

                ), market_data AS (
                    SELECT
                        'BqN7dPo4LheezCRC2kSX5PEyXBRNswvBzLzH7P5w2PWK' AS book_config,
                        CASE WHEN t.last_price IS NOT NULL 
                            THEN t.last_price
                            ELSE NULL 
                        END AS last_price,

                        CASE WHEN "24_hour_volume" IS NOT NULL 
                            THEN "24_hour_volume"
                            ELSE NULL 
                        END AS volume,

                        CASE WHEN "24_hour_turnover" IS NOT NULL 
                            THEN "24_hour_turnover"
                            ELSE NULL 
                        END AS turnover,

                        CASE WHEN "24_hour_price_change" IS NOT NULL 
                            THEN "24_hour_price_change"
                            ELSE NULL 
                        END AS change_delta,

                        CASE WHEN "24_hour_prev_last_price" IS NOT NULL 
                            THEN "24_hour_prev_last_price"
                            ELSE NULL 
                        END AS prev_last_price,

                        CASE WHEN t.timestamp IS NOT NULL 
                            THEN t.timestamp
                            ELSE NULL 
                        END AS "timestamp"

                    FROM trade_data_24_hour AS t 
                    WHERE book_config = 'BqN7dPo4LheezCRC2kSX5PEyXBRNswvBzLzH7P5w2PWK'
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
                        
                        'positionConfig', (
                            SELECT pubkey_id
                            FROM order_position_config
                            WHERE pubkey_id = 'BqN7dPo4LheezCRC2kSX5PEyXBRNswvBzLzH7P5w2PWK'
                        ),

                        'book', json_build_object(
                            'asks', book_asks.asks,
                            'bids', book_bids.bids
                        ),

                        'trades', h.trades,

                        'marketData', json_build_object(
                            'lastPrice', md.last_price,
                            'volume', md.volume,
                            'turnover', md.turnover,
                            'changeDelta', md.change_delta,
                            'prevLastPrice', md.prev_last_price,
                            'time', md.timestamp
                        )
                    )

                FROM trade_pair AS t
                FULL JOIN trade_history_agg AS h ON h.book_config = t.pubkey_id
                FULL JOIN market_data AS md ON md.book_config = t.pubkey_id
                FULL JOIN agg_asks AS book_asks ON book_asks.pubkey_id = t.pubkey_id
                FULL JOIN agg_bids AS book_bids ON book_bids.pubkey_id = t.pubkey_id;



WITH positions AS (
    SELECT
        json_build_object(
            'positionId', p.pubkey_id,
            'marketId', p.book_config,
            'positionConfig', p.position_config,
            'orderType', p.order_type,
            'price', p.price,
            'size', p.size,
            -- need filled total of size, currently not tracking
            'slot', p.slot
        ) AS "data"

    FROM order_position_config AS c
    JOIN order_position AS p ON p.position_config = c.pubkey_id
    WHERE market_maker = $1
    ORDER BY p.book_config p.slot DESC
    
)

SELECT
    array_agg(
        p.data
    ) AS "data"

FROM positions AS p;
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
    "timestamp"
    "is_head"


UPDATE order_position AS p
SET is_hard = false
WHERE 
(($13::BOOLEAN IS TRUE AND p.is_hard IS TRUE)
OR
($13::BOOLEAN IS FALSE AND p.is_hard IS NULL))
AND p.order_type = $7::order_type

WITH change AS (
    UPDATE order_position 
    SET is_head = false
    -- WHERE is_head IS TRUE::BOOLEAN
     WHERE 
        CASE WHEN false
        THEN is_head IS true
        ELSE is_head IS NULL
        END
    AND order_type = 'bid'::order_type

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
)
VALUES (
    'xyzzzsf',
    '26N4LDjnqvcEAHFgxDQA4vgL5frFLGUn8U5hxmTo3Zw6',
    '7t3guwpq3TFaQRTDrXFEgnYXU2F67mH51ND68AdZXTTy',
    'asdf',
    'asdf',
    'asdf',
    'bid',
    10,
    10,
    true::BOOLEAN,
    0,
    0,
    false::BOOLEAN
);




                WITH input AS (
                    SELECT * FROM (
                    VALUES  (
                        '26N4LDjnqvcEAHFgxDQA4vgL5frFLGUn8U5hxmTo3Zw6',
                        '7t3guwpq3TFaQRTDrXFEgnYXU2F67mH51ND68AdZXTTy',
                        10, 
                        'bid'::order_type
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
                                AND max_pubkey_id IS NOT NULL)
                            OR (
                                min_pubkey_id IS NOT NULL
                                AND max_pubkey_id IS NULL
                                AND min_next_position IS NULL))
                                    THEN min_pubkey_id

                            WHEN order_type = 'bid'
                            AND min_pubkey_id IS NULL
                            AND max_pubkey_id IS NOT NULL
                            AND NOT (max_pubkey_id = (SELECT pubkey_id FROM head_bid))
                                THEN max_pubkey_id

                            WHEN order_type = 'ask'  
                            AND ((
                                min_pubkey_id IS NOT NULL
                                AND max_pubkey_id IS NOT NULL)
                            OR (
                                max_pubkey_id IS NOT NULL
                                AND min_pubkey_id IS NULL
                                AND max_next_position IS NULL))
                                    THEN max_pubkey_id

                            WHEN order_type = 'ask'  
                            AND min_pubkey_id IS NOT NULL
                            AND max_pubkey_id IS NULL
                            AND NOT (min_pubkey_id = (SELECT pubkey_id FROM head_ask))
                                THEN min_pubkey_id
                            
                            ELSE NULL
                        END AS prev_pubkey_id,

                        CASE
                            WHEN order_type = 'bid' 
                            AND ((
                                min_pubkey_id IS NOT NULL
                                AND max_pubkey_id IS NOT NULL)
                            OR (
                                max_pubkey_id = (SELECT pubkey_id FROM head_bid)
                                AND (SELECT price FROM input) < (SELECT price FROM head_ask)))
                                    THEN max_pubkey_id

                            WHEN order_type = 'bid' 
                            AND min_pubkey_id IS NOT NULL
                            AND min_next_position IS NOT NULL
                            AND max_pubkey_id IS NULL
                                THEN min_pubkey_id

                            WHEN order_type = 'ask'  
                            AND ( 
                                min_pubkey_id IS NOT NULL
                                AND max_pubkey_id IS NOT NULL)
                            OR (
                                min_pubkey_id = (SELECT pubkey_id FROM head_ask)
                                AND (SELECT price FROM input) > (SELECT price FROM head_bid))
                                    THEN min_pubkey_id

                            WHEN order_type = 'ask'  
                            AND max_pubkey_id IS NOT NULL
                            AND max_next_position IS NOT NULL
                            AND min_pubkey_id IS NULL
                                THEN max_pubkey_id
                            
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

                        UNION
                        SELECT
                            ledger.order_type AS order_type,
                            ledger.slot AS slot,

                            min_price.pubkey_id AS min_pubkey_id, 
                            min_price.price AS min_price,
                            min_price.next_position AS min_next_position, 
                            min_price.slot AS min_slot,

                            max_price.pubkey_id  AS max_pubkey_id, 
                            NULL AS max_price,
                            NULL AS max_next_position, 
                            NULL AS max_slot
                        FROM ledger
                        LEFT JOIN min_price ON min_price.pubkey_id = ledger.pubkey_id
                        LEFT JOIN max_price ON max_price.pubkey_id = ledger.pubkey_id
                        WHERE min_price.pubkey_id IS NOT NULL 
                        AND ((
                            ledger.order_type = 'bid'::order_type
                            AND max_price.pubkey_id IS NULL
                            AND min_price.next_position IS NULL
                        ) 
                        OR (
                            ledger.order_type = 'ask'::order_type
                            AND max_price.pubkey_id IS NULL
                            AND ((SELECT price FROM input) > min_price.price
                            OR (SELECT pubkey_id FROM head_ask) = min_price.pubkey_id
                            AND (SELECT price FROM input) > (SELECT price FROM head_bid))
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
                        WHERE max_price.pubkey_id IS NOT NULL 
                        AND ((
                            ledger.order_type = 'bid'::order_type
                            AND min_price.pubkey_id IS NULL
                            AND ((SELECT price FROM input) < max_price.price
                            OR (SELECT pubkey_id FROM head_bid) = max_price.pubkey_id
                            AND (SELECT price FROM input) < (SELECT price FROM head_ask))
                        ) 
                        OR (
                            ledger.order_type = 'ask'::order_type
                            AND min_price.pubkey_id IS NULL
                            AND max_price.next_position IS NULL
                        ))
                    )

                    -- WHERE ( 
                    --     min_pubkey_id IS NULL
                    --     AND max_pubkey_id IS NULL
                        
                    -- ) OR ((SELECT order_type FROM input) = 'bid'::order_type AND (
                    --     min_pubkey_id IS NOT NULL
                    --     AND max_pubkey_id IS NOT NULL
                    --     AND min_next_position = max_pubkey_id
                        
                    -- ) OR (
                    --     min_pubkey_id IS NULL
                    --     AND max_pubkey_id IS NOT NULL
                    --     AND (max_next_position IS NULL
                    --     OR  max_pubkey_id = (SELECT pubkey_id FROM head_bid))

                    -- ) OR (
                    --     min_pubkey_id IS NOT NULL
                    --     AND max_pubkey_id IS NULL

                    -- )) OR ((SELECT order_type FROM input) = 'ask'::order_type AND (
                    --     min_pubkey_id IS NOT NULL
                    --     AND max_pubkey_id IS NOT NULL
                    --     AND max_next_position = min_pubkey_id

                    -- ) OR (
                    --     max_pubkey_id IS NULL
                    --     AND min_pubkey_id IS NOT NULL
                    --     AND (min_next_position IS NULL
                    --     OR min_pubkey_id = (SELECT pubkey_id FROM head_ask))

                    -- ) OR (
                    --     min_pubkey_id IS NULL
                    --     AND max_pubkey_id IS NOT NULL
                    --     AND (SELECT price FROM input) > (SELECT price FROM head_bid)
                    --     AND max_pubkey_id = (SELECT pubkey_id FROM head_ask)

                    -- ))

                )

                SELECT 
                    t.pubkey_id AS book_config,
                    CASE 
                        WHEN (SELECT order_type FROM input) = 'bid'::order_type
                            THEN t.sell_market
                        WHEN (SELECT order_type FROM input) = 'ask'::order_type
                            THEN t.buy_market
                    END AS market_pointer,
                    (SELECT order_type FROM input) as order_type,
                    t.token_mint_a,
                    t.token_mint_b,
                    t.token_program_a,
                    t.token_program_b,
                    t.is_reverse,
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
                    (SELECT price FROM head_bid) AS head_bid_price

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