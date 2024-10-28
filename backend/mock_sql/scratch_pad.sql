

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
    WHERE opc.order_book_config_pubkey = $1 AND op.order_type = $2
    ORDER BY op.price ASC

), min_price AS (
    SELECT
        t.pubkey_id AS pubkey_id,
        MIN(t.price) as price
    FROM t
    WHERE t.price >= $3    
    GROUP BY s.pubkey_id

) max_price AS (
    SELECT
        t.pubkey_id AS pubkey_id,
        MAX(t.price) AS price
    FROM t
    WHERE t.price <= $3    
    GROUP BY s.pubkey_id
    
), f AS (
    SELECT
        CASE 
            WHEN t.order_type = 'bid'
                THEN max_pubkey_id
            WHEN t.order_type = 'ask'
                THEN min_pubkey_id
        END AS prev_pubkey_id,

        CASE 
            WHEN t.order_type = 'bid'
                THEN min_pubkey_id
            WHEN t.order_type = 'ask'
                THEN max_pubkey_id
        END AS next_pubkey_id

    FROM min_price 
    LEFT JOIN max_price

), e AS (
    SELECT 
        *
    FROM t
    JOIN min_price ON min_price.price = t.price
    JOIN max_price ON max_price.price = t.price

)

SELECT
    *
FROM e
JOIN f ON e.pubkey_id = f.prev_pubkey_id
WHERE e.next_order_pos = f.next_pubkey_id;
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




--- mock


WITH s AS (
    SELECT * FROM order_book_config AS obc
    WHERE obc.pubkey_id = 'BqN7dPo4LheezCRC2kSX5PEyXBRNswvBzLzH7P5w2PWK'

), l AS (
    SELECT
        op.pubkey_id AS "pubkey_id", 
        op.pubkey_id AS "order_pos_config", 
        op.order_type AS "order_type", 
        op.price AS "price", 
        op.size AS "size"

    FROM order_position AS op
    WHERE op.order_book_config_pubkey = 'BqN7dPo4LheezCRC2kSX5PEyXBRNswvBzLzH7P5w2PWK' 

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
    JOIN s ON s.pubkey_id = 'BqN7dPo4LheezCRC2kSX5PEyXBRNswvBzLzH7P5w2PWK'
    WHERE opc.order_book_config_pubkey = 'BqN7dPo4LheezCRC2kSX5PEyXBRNswvBzLzH7P5w2PWK' 
    AND op.order_type = 'bid'
    ORDER BY op.price ASC

), bid_head AS (
    SELECT 
        MAX(l.price) AS price
    FROM l
    WHERE l.order_type = 'bid'

), ask_head AS (
    SELECT 
        MIN(l.price) AS price
    FROM l
    WHERE l.order_type = 'ask'

), min_price AS (
    SELECT
        MIN(t.price) as price
    FROM t
    WHERE (t.price >= 3 AND t.order_type = 'ask')
    OR (t.price > 3 AND t.order_type = 'bid')

), max_price AS (
    SELECT
        MAX(t.price) AS price
    FROM t
    WHERE (t.price <= 3  AND t.order_type = 'bid')
    OR (t.price < 3  AND t.order_type = 'ask')

), bid_head_id AS (
    SELECT 
        l.pubkey_id,
        l.price
    FROM l
    JOIN bid_head ON bid_head.price = l.price

), ask_head_id AS (
    SELECT 
        l.pubkey_id,
        l.price
    FROM l
    JOIN ask_head ON ask_head.price = l.price

), max_price_id AS (
    SELECT 
        t.pubkey_id,
        t.price
    FROM t
    JOIN max_price ON max_price.price = t.price

), min_price_id AS (
    SELECT 
        t.pubkey_id,
        t.price
    FROM t
    JOIN min_price ON min_price.price = t.price

), cross_price AS (
    SELECT 
        max_v.pubkey_id AS max_price_id,
        max_v.price AS max_price,
        min_v.pubkey_id AS min_price_id,
        min_v.price AS min_price
     FROM max_price_id AS max_v , min_price_id AS min_v

)

    SELECT
        -- CASE 
        --     WHEN t.order_type = 'bid' AND 3 > c.min_price
        --         THEN NULL
        --     WHEN t.order_type = 'bid' AND c.min_price >= 3 AND 3 > c.max_price
        --         THEN min_price_id
        --     WHEN t.order_type = 'bid' AND c.max_price >= 3
        --         THEN max_price_id

        --     WHEN t.order_type = 'ask' AND 3 < c.min_price
        --         THEN NULL
        --     WHEN t.order_type = 'ask' AND  c.min_price <= 3 AND 3 < c.max_price
        --         THEN min_price_id
        --     WHEN t.order_type = 'ask' AND c.max_price <= 3
        --         THEN max_price_id

        -- END AS prev_pubkey_id,

        -- CASE

        --     WHEN t.order_type = 'bid' AND 3 > c.min_price
        --         THEN min_price_id
        --     WHEN t.order_type = 'bid' AND c.min_price >= 3 AND 3 > c.max_price
        --         THEN max_price_id
        --     WHEN t.order_type = 'bid' AND c.max_price >= 3
        --         THEN NULL

        --     WHEN t.order_type = 'ask' AND 3 < c.min_price 
        --         THEN min_price_id
        --     WHEN t.order_type = 'ask' AND c.min_price <= 3 OR 3 < c.max_price
        --         THEN max_price_id
        --     WHEN t.order_type = 'ask' AND 3 > c.max_price
        --         THEN NULL
        -- END AS next_pubkey_id
        *

    FROM t
    -- JOIN cross_price AS c ON c.min_price_id = t.pubkey_id OR c.max_price_id = t.pubkey_id
    LEFT JOIN min_price_id ON min_price_id.pubkey_id = t.pubkey_id
    LEFT JOIN max_price_id ON max_price_id.pubkey_id = t.pubkey_id
    -- WHERE t.next_order_pos = c.min_price_id OR t.next_order_pos = c.max_price_id;


    --max_price_id, min_price_id
    -- FULL JOIN max_price_id ON max_price_id.price = t.price
    -- FULL JOIN min_price_id ON min_price_id.price = t.price
    -- WHERE t.price = min_price_id.price OR t.price = max_price_id.price;



WITH trade_pair AS (
    SELECT * FROM order_book_config AS obc
    WHERE obc.pubkey_id = 'BqN7dPo4LheezCRC2kSX5PEyXBRNswvBzLzH7P5w2PWK'

), ledger AS (
    SELECT
        op.pubkey_id AS "pubkey_id",
        op.next_position AS "next_position",
        op.order_type AS "order_type",
        op.price AS "price",
        op.slot AS "slot"

    FROM order_position AS op
    WHERE op.book_config = 'BqN7dPo4LheezCRC2kSX5PEyXBRNswvBzLzH7P5w2PWK' 
    AND op.order_type = 'bid'::order_type
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
                -- ledger.pubkey_id AS "pubkey_id",
                MIN(ledger.price) as price

            FROM ledger
            WHERE ledger.price >= 11
            -- GROUP BY ledger.pubkey_id

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
                -- ledger.pubkey_id AS "pubkey_id",
                MAX(ledger.price) as price

            FROM ledger
            WHERE ledger.price <= 11
            -- GROUP BY ledger.pubkey_id

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
    WHERE p.book_config = 'BqN7dPo4LheezCRC2kSX5PEyXBRNswvBzLzH7P5w2PWK'
    AND p.order_type = 'ask' AND p.is_head
    LIMIT 1

), head_bid AS (
    SELECT 
        pubkey_id,
        price
    FROM order_position AS p
    WHERE p.book_config = 'BqN7dPo4LheezCRC2kSX5PEyXBRNswvBzLzH7P5w2PWK'
    AND p.order_type = 'bid' AND p.is_head
    LIMIT 1

), node AS (
    SELECT 
        CASE
            WHEN order_type = 'bid' 
            AND min_pubkey_id IS NOT NULL
            AND max_pubkey_id IS NOT NULL
                THEN min_pubkey_id

            WHEN order_type = 'bid'
            AND min_pubkey_id IS NULL
            AND max_pubkey_id IS NOT NULL
                THEN max_pubkey_id

            WHEN order_type = 'ask'  
            AND min_pubkey_id IS NOT NULL
            AND max_pubkey_id IS NOT NULL
                THEN max_pubkey_id

            WHEN order_type = 'ask'  
            AND min_pubkey_id IS NOT NULL
            AND max_pubkey_id IS NULL
                THEN min_pubkey_id
            
            ELSE NULL
        END AS prev_pubkey_id,

        CASE
            WHEN order_type = 'bid' 
            AND min_pubkey_id IS NOT NULL
            AND max_pubkey_id IS NOT NULL
                THEN max_pubkey_id

            WHEN order_type = 'bid' 
            AND min_pubkey_id IS NOT NULL
            AND max_pubkey_id IS NULL
                THEN min_pubkey_id

            WHEN order_type = 'ask'  
            AND min_pubkey_id IS NOT NULL
            AND max_pubkey_id IS NOT NULL
                THEN min_pubkey_id

            WHEN order_type = 'ask'  
            AND min_pubkey_id IS NULL
            AND max_pubkey_id IS NOT NULL
                THEN max_pubkey_id
            
            ELSE NULL
        END AS next_pubkey_id
    
    FROM (
        SELECT
            min_price.order_type AS order_type,
            max_price.slot AS slot,
            min_price.pubkey_id AS min_pubkey_id, -- min_price.pubkey_id
            min_price.price AS min_price,
            min_price.next_position AS min_next_position, -- min_price.next_position
            min_price.slot AS min_slot,

            max_price.pubkey_id AS max_pubkey_id, -- max_price.pubkey_id
            max_price.price AS max_price,
            max_price.next_position AS max_next_position, -- max_price.next__position 
            max_price.slot AS max_slot
        FROM min_price, max_price
    )
    WHERE min_pubkey_id IS NOT NULL OR max_pubkey_id IS NOT NULL
    AND ( 
        min_pubkey_id IS NULL
        AND max_pubkey_id IS NULL
        
    ) OR ( ('bid'::order_type) = 'bid'::order_type AND (
        min_pubkey_id IS NOT NULL
        AND max_pubkey_id IS NOT NULL
        AND min_next_position = max_pubkey_id
        
    ) OR (
        min_pubkey_id IS NULL
        AND max_pubkey_id IS NOT NULL
        AND max_next_position IS NULL

    ) OR (
        min_pubkey_id IS NOT NULL
        AND max_pubkey_id IS NULL
        AND 11 < (SELECT price FROM head_ask)
        AND min_pubkey_id = (SELECT pubkey_id FROM head_bid)

    )) OR ( 'ask'::order_type = 'ask'::order_type AND (
        min_pubkey_id IS NOT NULL
        AND max_pubkey_id IS NOT NULL
        AND max_next_position = min_pubkey_id

    ) OR (
        min_pubkey_id IS NOT NULL
        AND max_pubkey_id IS NULL
        AND min_next_position IS NULL

    ) OR (
        min_pubkey_id IS NULL
        AND max_pubkey_id IS NOT NULL
        AND 11 > (SELECT price FROM head_bid)
        AND max_pubkey_id = (SELECT pubkey_id FROM head_ask)

    ))

)

SELECT * FROM node;



, position_config_id AS (
    SELECT pubkey_id FROM order_position_config
    WHERE pubkey_id = $5
)

SELECT
    *
FROM min_price, max_price
JOIN ledger ON ledger.pubkey_id = min_pubkey_id;