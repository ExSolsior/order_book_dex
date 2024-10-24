WITH trade_pair AS (
    SELECT * FROM order_book_config AS obc
    WHERE obc.pubkey_id = 'BqN7dPo4LheezCRC2kSX5PEyXBRNswvBzLzH7P5w2PWK'

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
    JOIN trade_pair AS s ON s.pubkey_id = 'BqN7dPo4LheezCRC2kSX5PEyXBRNswvBzLzH7P5w2PWK'
    WHERE opc.order_book_config_pubkey = 'BqN7dPo4LheezCRC2kSX5PEyXBRNswvBzLzH7P5w2PWK'
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
        'BqN7dPo4LheezCRC2kSX5PEyXBRNswvBzLzH7P5w2PWK' AS "pubkey_id",
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