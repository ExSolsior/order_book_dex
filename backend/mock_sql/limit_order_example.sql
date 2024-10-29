WITH input AS (
    SELECT * FROM (
    VALUES  (
        'BqN7dPo4LheezCRC2kSX5PEyXBRNswvBzLzH7P5w2PWK',
        '49wBdBzzw9eMre1wT27TD1b8hgW9x9tCWFtvAUmLohtp',
        24, 
        'ask'::order_type
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

    WHERE ( 
        min_pubkey_id IS NULL
        AND max_pubkey_id IS NULL
        
    ) OR ((SELECT order_type FROM input) = 'bid'::order_type AND (
        min_pubkey_id IS NOT NULL
        AND max_pubkey_id IS NOT NULL
        AND min_next_position = max_pubkey_id
        
    ) OR (
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
        max_pubkey_id IS NULL
        AND min_pubkey_id IS NOT NULL
        AND (min_next_position IS NULL
        OR min_pubkey_id = (SELECT pubkey_id FROM head_ask))

    ) OR (
        min_pubkey_id IS NULL
        AND max_pubkey_id IS NOT NULL
        AND (SELECT price FROM input) > (SELECT price FROM head_bid)
        AND max_pubkey_id = (SELECT pubkey_id FROM head_ask)

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
