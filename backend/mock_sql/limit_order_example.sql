WITH input AS (
    SELECT 
        *
    FROM (
    VALUES  (
        'BqN7dPo4LheezCRC2kSX5PEyXBRNswvBzLzH7P5w2PWK',
        20, 
        'ask'::order_type
    )) AS t ("book_config", "price", "order_type")

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
        -- *,
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

            NULL AS max_pubkey_id, 
            NULL AS max_price,
            NULL AS max_next_position, 
            NULL AS max_slot
        FROM ledger
        LEFT JOIN min_price ON min_price.pubkey_id = ledger.pubkey_id
        LEFT JOIN max_price ON max_price.pubkey_id = ledger.pubkey_id
        WHERE min_price.pubkey_id IS NOT NULL 
        AND max_price.pubkey_id IS NULL
        AND min_price.next_position IS NULL

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
        AND min_price.pubkey_id IS NULL

    )
    -- WHERE min_pubkey_id IS NOT NULL OR max_pubkey_id IS NOT NULL

    -- WHERE ( 
    --     min_pubkey_id IS NULL
    --     AND max_pubkey_id IS NULL
        
    -- ) OR (('bid'::order_type) = 'bid'::order_type AND (
    --     min_pubkey_id IS NOT NULL
    --     AND max_pubkey_id IS NOT NULL
    --     AND min_next_position = max_pubkey_id
        
    -- ) OR (
    --     min_pubkey_id IS NULL
    --     AND max_pubkey_id IS NOT NULL
    --     AND max_next_position IS NULL

    -- ) OR (
    --     min_pubkey_id IS NOT NULL
    --     AND max_pubkey_id IS NULL
    --     AND (SELECT price FROM input) < (SELECT price FROM head_ask)
    --     AND min_pubkey_id = (SELECT pubkey_id FROM head_bid)

    -- )) OR ( 'ask'::order_type = 'ask'::order_type AND (
    --     min_pubkey_id IS NOT NULL
    --     AND max_pubkey_id IS NOT NULL
    --     AND max_next_position = min_pubkey_id

    -- ) OR (
    --     min_pubkey_id IS NOT NULL
    --     AND max_pubkey_id IS NULL
    --     AND min_next_position IS NULL

    -- ) OR (
    --     min_pubkey_id IS NULL
    --     AND max_pubkey_id IS NOT NULL
    --     AND (SELECT price FROM input) > (SELECT price FROM head_bid)
    --     AND max_pubkey_id = (SELECT pubkey_id FROM head_ask)

    -- ))

)

-- SELECT * FROM min_price;

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

            NULL AS max_pubkey_id, 
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
            AND min_price.next_position IS NULL
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
        ) 
        OR (
            ledger.order_type = 'ask'::order_type
            AND min_price.pubkey_id IS NULL
            AND max_price.next_position IS NULL
        ));

