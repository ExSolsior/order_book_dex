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
        op.price AS "price",                    -- I wonder how these will serialize into json?
        op.size AS "size",                      -- I wonder how these will serialize into json?
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