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



WITH input AS (
                    SELECT * FROM (
                    VALUES  (
                        $1,
                        $2,
                        $3, 
                        $4::order_type
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
                                AND max_pubkey_id IS NOT NULL )
                            OR (
                                min_pubkey_id IS NOT NULL
                                AND max_pubkey_id IS NULL ))
                                    THEN min_pubkey_id
  

                            WHEN order_type = 'ask'  
                            AND ((
                                min_pubkey_id IS NOT NULL
                                AND max_pubkey_id IS NOT NULL)
                            OR (
                                max_pubkey_id IS NOT NULL
                                AND min_pubkey_id IS NULL
                                AND max_next_position IS NULL))
                                    THEN max_pubkey_id

                            
                            ELSE NULL
                        END AS prev_pubkey_id,

                        CASE
                            WHEN order_type = 'bid' 
                            AND ((
                                min_pubkey_id IS NOT NULL
                                AND max_pubkey_id IS NOT NULL)
                            OR (
                                min_pubkey_id IS NULL
                                AND max_pubkey_id IS NOT NULL ))
                                    THEN max_pubkey_id


                            WHEN order_type = 'ask'  
                            AND ( 
                                min_pubkey_id IS NOT NULL
                                AND max_pubkey_id IS NOT NULL)
                            OR (
                                min_pubkey_id IS NOT NULL
                                AND max_pubkey_id IS NULL)
                                    THEN min_pubkey_id
                            
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
                        WHERE ( min_price.order_type = 'bid'::order_type
                            AND min_price.next_position = max_price.pubkey_id )
                        OR 
                            ( max_price.order_type = 'ask'::order_type
                            AND max_price.next_position = min_price.pubkey_id )

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
                        WHERE min_price.pubkey_id IS NOT NULL AND max_price.pubkey_id IS NULL
                        ((
                            ledger.order_type = 'bid'::order_type
                            AND min_price.next_position IS NULL
                        ) 
                        OR (
                            ledger.order_type = 'ask'::order_type
                            AND (SELECT pubkey_id FROM head_ask) = min_price.pubkey_id
                            AND (SELECT price FROM input) < min_price.price
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
                        WHERE max_price.pubkey_id IS NOT NULL AND min_price.pubkey_id IS NULL
                        AND ((
                            ledger.order_type = 'ask'::order_type
                            AND max_price.next_position IS NULL
                        ) 
                        OR (
                            ledger.order_type = 'bid'::order_type
                            AND (SELECT pubkey_id FROM head_bid) = max_price.pubkey_id
                            AND (SELECT price FROM input) > max_price.price
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
                        -- not sure -> set head
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
                        -- not sure -> set head
                        max_pubkey_id IS NULL
                        AND min_pubkey_id IS NOT NULL
                        AND (min_next_position IS NULL
                        OR min_pubkey_id = (SELECT pubkey_id FROM head_ask))

                    ) OR (
                        min_pubkey_id IS NULL
                        AND max_pubkey_id IS NOT NULL
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
                    (SELECT price FROM head_bid) AS head_bid_price,
                    (SELECT pubkey_id FROM head_ask) AS head_ask_pubkey_id,
                    (SELECT pubkey_id FROM head_bid) AS head_bid_pubkey_id

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

























                                WITH input AS (
                    SELECT * FROM (
                    VALUES  (
                        $1,
                        $2,
                        $3, 
                        $4::order_type
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
                    AND p.order_type = 'ask' AND p.is_head IS TRUE
                    LIMIT 1

                ), head_bid AS (
                    SELECT 
                        pubkey_id,
                        price
                    FROM order_position AS p
                    WHERE p.book_config = (SELECT "book_config" FROM input)
                    AND p.order_type = 'bid' AND p.is_head IS TRUE
                    LIMIT 1

                ), node AS (
                    SELECT 
                        (SELECT book_config FROM input) AS book_config,
                        CASE
                            WHEN order_type = 'bid' 
                            AND ((
                                min_pubkey_id IS NOT NULL
                                AND max_pubkey_id IS NOT NULL )
                            OR (
                                min_pubkey_id IS NOT NULL
                                AND max_pubkey_id IS NULL ))
                                    THEN min_pubkey_id
  

                            WHEN order_type = 'ask'  
                            AND ((
                                min_pubkey_id IS NOT NULL
                                AND max_pubkey_id IS NOT NULL)
                            OR (
                                max_pubkey_id IS NOT NULL
                                AND min_pubkey_id IS NULL
                                AND max_next_position IS NULL))
                                    THEN max_pubkey_id

                            
                            ELSE NULL
                        END AS prev_pubkey_id,

                        CASE
                            WHEN order_type = 'bid' 
                            AND ((
                                min_pubkey_id IS NOT NULL
                                AND max_pubkey_id IS NOT NULL)
                            OR (
                                min_pubkey_id IS NULL
                                AND max_pubkey_id IS NOT NULL ))
                                    THEN max_pubkey_id


                            WHEN order_type = 'ask'  
                            AND (( 
                                min_pubkey_id IS NOT NULL
                                AND max_pubkey_id IS NOT NULL)
                            OR (
                                min_pubkey_id IS NOT NULL
                                AND max_pubkey_id IS NULL))
                                    THEN min_pubkey_id
                            
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
                        WHERE ( min_price.order_type = 'bid'::order_type
                            AND min_price.next_position = max_price.pubkey_id )
                        OR 
                            ( max_price.order_type = 'ask'::order_type
                            AND max_price.next_position = min_price.pubkey_id )

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
                        WHERE min_price.pubkey_id IS NOT NULL AND max_price.pubkey_id IS NULL
                        AND ((
                            ledger.order_type = 'bid'::order_type
                            AND min_price.next_position IS NULL
                        ) OR (
                            ledger.order_type = 'ask'::order_type
                            AND (SELECT pubkey_id FROM head_ask) = min_price.pubkey_id
                            AND (SELECT price FROM input) < min_price.price
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
                        WHERE max_price.pubkey_id IS NOT NULL AND min_price.pubkey_id IS NULL
                        AND ((
                            ledger.order_type = 'ask'::order_type
                            AND max_price.next_position IS NULL
                        ) OR (
                            ledger.order_type = 'bid'::order_type
                            AND (SELECT pubkey_id FROM head_bid) = max_price.pubkey_id
                            AND (SELECT price FROM input) > max_price.price
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
                        -- not sure -> set head
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
                        -- not sure -> set head
                        max_pubkey_id IS NULL
                        AND min_pubkey_id IS NOT NULL
                        AND (min_next_position IS NULL
                        OR min_pubkey_id = (SELECT pubkey_id FROM head_ask))

                    ) OR (
                        min_pubkey_id IS NULL
                        AND max_pubkey_id IS NOT NULL
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
                    (SELECT price FROM head_bid) AS head_bid_price,
                    (SELECT pubkey_id FROM head_ask) AS head_ask_pubkey_id,
                    (SELECT pubkey_id FROM head_bid) AS head_bid_pubkey_id

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