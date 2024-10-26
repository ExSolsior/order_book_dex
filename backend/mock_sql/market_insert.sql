BEGIN;

WITH chart AS (
    SELECT 
        * 
    FROM real_time_trade_data AS td
    WHERE (86460) - 60 <= td.timestamp AND (86460) > td.timestamp

), open_time AS (
    SELECT 
        MIN("timestamp") AS "timestamp",
        book_config
    FROM chart
    GROUP BY book_config

), close_time AS (
    SELECT 
        MAX("timestamp") AS "timestamp",
        book_config
    FROM chart
    GROUP BY book_config

), open_price AS (
    SELECT 
        t.book_config,
        last_price
    FROM chart 
    JOIN open_time AS t ON t.book_config = chart.book_config
    AND t.timestamp = chart.timestamp

), close_price AS (
    SELECT 
        t.book_config,
        last_price
    FROM chart 
    JOIN close_time AS t ON t.book_config = chart.book_config
    AND t.timestamp = chart.timestamp

), low_price AS (
    SELECT 
        book_config,
        MIN(chart.last_price) AS last_price
    FROM chart 
    GROUP BY book_config

), high_price AS (
    SELECT 
        book_config,
        MAX(chart.last_price) AS last_price
    FROM chart 
    GROUP BY book_config

), total AS (
    SELECT 
        book_config,
        sum(chart.amount) AS "volume",
        sum(chart.last_price) AS "turnover"
    FROM chart
    GROUP BY book_config

), bars AS (
    SELECT 
        DISTINCT chart.book_config AS "book_config",
        '1m'::interval AS interval,
        o.last_price  AS "open",
        h.last_price as "high",
        l.last_price as "low",
        c.last_price  AS "close",
        t.volume,
        t.turnover,
        (86460) AS "timestamp"

    FROM chart
    INNER JOIN open_price AS o ON o.book_config = chart.book_config
    INNER JOIN high_price AS h ON h.book_config = chart.book_config
    INNER JOIN low_price AS l ON l.book_config = chart.book_config
    INNER JOIN close_price AS c ON c.book_config = chart.book_config
    INNER JOIN total AS t ON t.book_config = chart.book_config

    UNION
    SELECT * FROM market_order_history AS m
    WHERE m.timestamp <= (86460) - (60 * 60)
    AND m.interval = '1m'::interval

    UNION
    SELECT * FROM market_order_history AS m
    WHERE m.timestamp <= (86460) - (60 * 60 * 24)
    AND m.interval = '1h'::interval

    UNION
    SELECT * FROM market_order_history AS m
    WHERE m.timestamp <= (86460) - (60 * 60 * 24 * 366)
    AND m.interval = '1d'::interval

), minute_data AS (
    SELECT
        book_config,
        SUM(m.open) AS "open",
        SUM(m.high) AS "high",
        SUM(m.low) AS "low",
        SUM(m.close) AS "close",
        SUM(m.volume) AS "volume",
        SUM(m.turnover) AS "turnover"

    FROM bars AS m
    WHERE m.interval = '1m'::interval
    AND m.timestamp = (86460)
    GROUP BY m.book_config

), minute_2_data AS (
    SELECT
        book_config,
        SUM(m.open) AS "open",
        SUM(m.high) AS "high",
        SUM(m.low) AS "low",
        SUM(m.close) AS "close",
        SUM(m.volume) AS "volume",
        SUM(m.turnover) AS "turnover"

    FROM bars AS m
    WHERE ((86460) - ((86460) / 1440 * 1440)) % (60 * 2) = 0
    AND m.timestamp >= (86460) - (60 * 2)
    AND m.interval = '1m'::interval
    GROUP BY m.book_config

), minute_3_data AS (
    SELECT
        book_config,
        SUM(m.open) AS "open",
        SUM(m.high) AS "high",
        SUM(m.low) AS "low",
        SUM(m.close) AS "close",
        SUM(m.volume) AS "volume",
        SUM(m.turnover) AS "turnover"

    FROM bars AS m
    WHERE ((86460) - ((86460) / 1440 * 1440)) % (60 * 3) = 0
    AND m.timestamp >= (86460) - (60 * 3)
    AND m.interval = '1m'::interval
    GROUP BY m.book_config

), minute_4_data AS (
    SELECT
        book_config,
        SUM(m.open) AS "open",
        SUM(m.high) AS "high",
        SUM(m.low) AS "low",
        SUM(m.close) AS "close",
        SUM(m.volume) AS "volume",
        SUM(m.turnover) AS "turnover"

    FROM bars AS m
    WHERE ((86460) - ((86460) / 1440 * 1440)) % (60 * 4) = 0
    AND m.timestamp >= (86460) - (60 * 4)
    AND m.interval = '1m'::interval
    GROUP BY m.book_config

), minute_5_data AS (
    SELECT
        book_config,
        SUM(m.open) AS "open",
        SUM(m.high) AS "high",
        SUM(m.low) AS "low",
        SUM(m.close) AS "close",
        SUM(m.volume) AS "volume",
        SUM(m.turnover) AS "turnover"

    FROM bars AS m
    WHERE ((86460) - ((86460) / 1440 * 1440)) % (60 * 5) = 0
    AND m.timestamp >= (86460) - (60 * 5)
    AND m.interval = '1m'::interval
    GROUP BY m.book_config

), minute_10_data AS (
    SELECT
        book_config,
        SUM(m.open) AS "open",
        SUM(m.high) AS "high",
        SUM(m.low) AS "low",
        SUM(m.close) AS "close",
        SUM(m.volume) AS "volume",
        SUM(m.turnover) AS "turnover"

    FROM bars AS m
    WHERE ((86460) - ((86460) / 1440 * 1440)) % (60 * 10) = 0
    AND m.timestamp >= (86460) - (60 * 10)
    AND m.interval = '1m'::interval
    GROUP BY m.book_config

), minute_15_data AS (
    SELECT
        book_config,
        SUM(m.open) AS "open",
        SUM(m.high) AS "high",
        SUM(m.low) AS "low",
        SUM(m.close) AS "close",
        SUM(m.volume) AS "volume",
        SUM(m.turnover) AS "turnover"

    FROM bars AS m
    WHERE ((86460) - ((86460) / 1440 * 1440)) % (60 * 15) = 0
    AND m.timestamp >= (86460) - (60 * 15)
    AND m.interval = '1m'::interval
    GROUP BY m.book_config

), minute_20_data AS (
    SELECT
        book_config,
        SUM(m.open) AS "open",
        SUM(m.high) AS "high",
        SUM(m.low) AS "low",
        SUM(m.close) AS "close",
        SUM(m.volume) AS "volume",
        SUM(m.turnover) AS "turnover"

    FROM bars AS m
    WHERE ((86460) - ((86460) / 1440 * 1440)) % (60 * 20) = 0
    AND m.timestamp >= (86460) - (60 * 20)
    AND m.interval = '1m'::interval
    GROUP BY m.book_config

), minute_30_data AS (
    SELECT
        book_config,
        SUM(m.open) AS "open",
        SUM(m.high) AS "high",
        SUM(m.low) AS "low",
        SUM(m.close) AS "close",
        SUM(m.volume) AS "volume",
        SUM(m.turnover) AS "turnover"

    FROM bars AS m
    WHERE ((86460) - ((86460) / 1440 * 1440)) % (60 * 30) = 0
    AND m.timestamp >= (86460) - (60 * 30)
    AND m.interval = '1m'::interval
    GROUP BY m.book_config

), hour_data AS (
    SELECT 
        book_config,
        SUM(m.open) AS "open",
        SUM(m.high) AS "high",
        SUM(m.low) AS "low",
        SUM(m.close) AS "close",
        SUM(m.volume) AS "volume",
        SUM(m.turnover) AS "turnover"

    FROM bars AS m
    WHERE (86460) % 1440 = 0 
    AND m.timestamp >= (86460) - 1440
    AND m.interval = '1m'::interval
    GROUP BY m.book_config

), hour_2_data AS (
    SELECT 
        book_config,
        SUM(h.open) AS "open",
        SUM(h.high) AS "high",
        SUM(h.low) AS "low",
        SUM(h.close) AS "close",
        SUM(h.volume) AS "volume",
        SUM(h.turnover) AS "turnover"

    FROM bars AS h
    WHERE ((86460) - ((86460) / 86400 * 86400)) % (1440 * 2) = 0
    AND h.timestamp >= (86460) - (1440 * 2)
    AND h.interval = '1h'::interval
    GROUP BY h.book_config

), hour_3_data AS (
    SELECT 
        book_config,
        SUM(h.open) AS "open",
        SUM(h.high) AS "high",
        SUM(h.low) AS "low",
        SUM(h.close) AS "close",
        SUM(h.volume) AS "volume",
        SUM(h.turnover) AS "turnover"

    FROM bars AS h
    WHERE ((86460) - ((86460) / 86400 * 86400)) % (1440 * 3) = 0
    AND h.timestamp >= (86460) - (1440 * 3)
    AND h.interval = '1h'::interval
    GROUP BY h.book_config

), hour_4_data AS (
    SELECT 
        book_config,
        SUM(h.open) AS "open",
        SUM(h.high) AS "high",
        SUM(h.low) AS "low",
        SUM(h.close) AS "close",
        SUM(h.volume) AS "volume",
        SUM(h.turnover) AS "turnover"

    FROM bars AS h
    WHERE ((86460) - ((86460) / 86400 * 86400)) % (1440 * 4) = 0
    AND h.timestamp >= (86460) - (1440 * 4)
    AND h.interval = '1h'::interval
    GROUP BY h.book_config

), hour_6_data AS (
    SELECT 
        book_config,
        SUM(h.open) AS "open",
        SUM(h.high) AS "high",
        SUM(h.low) AS "low",
        SUM(h.close) AS "close",
        SUM(h.volume) AS "volume",
        SUM(h.turnover) AS "turnover"

    FROM bars AS h
    WHERE ((86460) - ((86460) / 86400 * 86400)) % (1440 * 6) = 0
    AND h.timestamp >= (86460) - (1440 * 6)
    AND h.interval = '1h'::interval
    GROUP BY h.book_config

), hour_8_data AS (
    SELECT 
        book_config,
        SUM(h.open) AS "open",
        SUM(h.high) AS "high",
        SUM(h.low) AS "low",
        SUM(h.close) AS "close",
        SUM(h.volume) AS "volume",
        SUM(h.turnover) AS "turnover"

    FROM bars AS h
    WHERE ((86460) - ((86460) / 86400 * 86400)) % (1440 * 8) = 0
    AND h.timestamp >= (86460) - (1440 * 8)
    AND h.interval = '1h'::interval
    GROUP BY h.book_config

), hour_12_data AS (
    SELECT 
        book_config,
        SUM(h.open) AS "open",
        SUM(h.high) AS "high",
        SUM(h.low) AS "low",
        SUM(h.close) AS "close",
        SUM(h.volume) AS "volume",
        SUM(h.turnover) AS "turnover"

    FROM bars AS h
    WHERE ((86460) - ((86460) / 86400 * 86400)) % (1440 * 12) = 0
    AND h.timestamp >= (86460) - (1440 * 12)
    AND h.interval = '1h'::interval
    GROUP BY h.book_config

), day_data AS (
    SELECT 
        book_config,
        SUM(h.open) AS "open",
        SUM(h.high) AS "high",
        SUM(h.low) AS "low",
        SUM(h.close) AS "close",
        SUM(h.volume) AS "volume",
        SUM(h.turnover) AS "turnover"

    FROM bars AS h
    WHERE (86460) % 86400 = 0 
    AND h.timestamp >= (86460) - 86400
    AND h.interval = '1h'::interval
    GROUP BY h.book_config

), day_2_data AS (
    SELECT
        book_config,
        SUM(d.open) AS "open",
        SUM(d.high) AS "high",
        SUM(d.low) AS "low",
        SUM(d.close) AS "close",
        SUM(d.volume) AS "volume",
        SUM(d.turnover) AS "turnover"

    FROM bars AS d
    WHERE ((86460) - ((86460) / (86400 * 7) * (86400 * 7))) % (86400 * 2) = 0
    AND d.timestamp >= (86460) - (86400 * 2)
    AND d.interval = '1d'::interval
    GROUP BY d.book_config

), day_3_data AS (
    SELECT
        book_config,
        SUM(d.open) AS "open",
        SUM(d.high) AS "high",
        SUM(d.low) AS "low",
        SUM(d.close) AS "close",
        SUM(d.volume) AS "volume",
        SUM(d.turnover) AS "turnover"

    FROM bars AS d
    WHERE ((86460) - ((86460) / (86400 * 7) * (86400 * 7))) % (86400 * 3) = 0
    AND d.timestamp >= (86460) - (86400 * 3)
    AND d.interval = '1d'::interval
    GROUP BY d.book_config

), week_data AS (
    SELECT
        book_config,
        SUM(d.open) AS "open",
        SUM(d.high) AS "high",
        SUM(d.low) AS "low",
        SUM(d.close) AS "close",
        SUM(d.volume) AS "volume",
        SUM(d.turnover) AS "turnover"

    FROM bars AS d
    WHERE (86460) % (86400 * 7) = 0
    AND d.timestamp >= (86460) - (86400 * 7)
    AND d.interval = '1d'::interval
    GROUP BY d.book_config

), week_2_data AS (
    SELECT
        book_config,
        SUM(w.open) AS "open",
        SUM(w.high) AS "high",
        SUM(w.low) AS "low",
        SUM(w.close) AS "close",
        SUM(w.volume) AS "volume",
        SUM(w.turnover) AS "turnover"

    FROM bars AS w
    WHERE ((86460) - ((86460) / (86400 * 7 * 4) * (86400 * 7 * 4))) % ((86400 * 7) * 2) = 0
    AND w.timestamp >= (86460) - ((86400 * 7) * 2)
    AND w.interval = '1d'::interval
    GROUP BY w.book_config

), week_3_data AS (
    SELECT
        book_config,
        SUM(w.open) AS "open",
        SUM(w.high) AS "high",
        SUM(w.low) AS "low",
        SUM(w.close) AS "close",
        SUM(w.volume) AS "volume",
        SUM(w.turnover) AS "turnover"

    FROM bars AS w
    WHERE ((86460) - ((86460) / (86400 * 7 * 4) * (86400 * 7 * 4))) % ((86400 * 7) * 3) = 0
    AND w.timestamp >= (86460) - ((86400 * 7) * 3)
    AND w.interval = '1d'::interval
    GROUP BY w.book_config

), market_data AS (
    SELECT 
        *, 
        '1m'::interval AS "interval",
        (86460) AS "timestamp" 
    FROM minute_data
    UNION
    SELECT 
        *, 
        '2m'::interval AS "interval",
        (86460) AS "timestamp" 
    FROM minute_2_data
    UNION
    SELECT 
        *, 
        '3m'::interval AS "interval",
        (86460) AS "timestamp" 
    FROM minute_3_data
    UNION
    SELECT 
        *, 
        '4m'::interval AS "interval",
        (86460) AS "timestamp" 
    FROM minute_4_data
    UNION
    SELECT 
        *, 
        '5m'::interval AS "interval",
        (86460) AS "timestamp" 
    FROM minute_5_data
    UNION
    SELECT 
        *, 
        '10m'::interval AS "interval",
        (86460) AS "timestamp" 
    FROM minute_10_data
    UNION
    SELECT 
        *, 
        '15m'::interval AS "interval",
        (86460) AS "timestamp" 
    FROM minute_15_data
    UNION
    SELECT 
        *, 
        '20m'::interval AS "interval",
        (86460) AS "timestamp" 
    FROM minute_20_data
    UNION
    SELECT 
        *, 
        '30m'::interval AS "interval",
        (86460) AS "timestamp" 
    FROM minute_30_data
    UNION
    SELECT 
        *, 
        '1h'::interval AS "interval",
        (86460) AS "timestamp" 
    FROM hour_data
    UNION
    SELECT 
        *, 
        '2h'::interval AS "interval",
        (86460) AS "timestamp" 
    FROM hour_2_data
    UNION
    SELECT 
        *, 
        '3h'::interval AS "interval",
        (86460) AS "timestamp" 
    FROM hour_3_data
    UNION
    SELECT 
        *, 
        '4h'::interval AS "interval",
        (86460) AS "timestamp" 
    FROM hour_4_data
    UNION
    SELECT 
        *, 
        '6h'::interval AS "interval",
        (86460) AS "timestamp" 
    FROM hour_6_data
    UNION
    SELECT 
        *, 
        '8h'::interval AS "interval",
        (86460) AS "timestamp" 
    FROM hour_8_data
    UNION
    SELECT 
        *, 
        '12h'::interval AS "interval",
        (86460) AS "timestamp" 
    FROM hour_12_data
    UNION
    SELECT 
        *, 
        '1D'::interval AS "interval",
        (86460) AS "timestamp" 
    FROM day_data
    UNION
    SELECT 
        *, 
        '2D'::interval AS "interval",
        (86460) AS "timestamp" 
    FROM day_2_data
    UNION
    SELECT 
        *, 
        '3D'::interval AS "interval",
        (86460) AS "timestamp" 
    FROM day_3_data
    UNION
    SELECT 
        *, 
        '1W'::interval AS "interval",
        (86460) AS "timestamp" 
    FROM week_data
    UNION
    SELECT 
        *, 
        '2W'::interval AS "interval",
        (86460) AS "timestamp" 
    FROM week_2_data
    UNION
    SELECT 
        *, 
        '3W'::interval AS "interval",
        (86460) AS "timestamp" 
    FROM week_3_data
    -- M, 2M, 3M, 4M, 6M, 12M | 1Y, are a bit complex to create, will do later
    -- not important to do for MVP

)

INSERT INTO market_order_history (
    "book_config",
    "interval",
    "open",
    "high",
    "low",
    "close",
    "volume",
    "turnover",
    "timestamp"
)
SELECT 
    m.book_config,
    m.interval,
    m.open,
    m.high,
    m.low,
    m.close,
    m.volume,
    m.turnover,
    m.timestamp

FROM market_data AS m;


WITH pre_candle AS (
    SELECT
        m.book_config,
        m.close,
        m.volume,
        m.turnover,
        m.timestamp

    FROM market_order_history AS m
    WHERE m.interval = '1m'::interval 
    AND (m.timestamp = (86460) OR m.timestamp = ((86460) - 86400)) 

), candle AS (


    -- current
    -- fall back if no rows exist,
    -- but shouldn't be the case since inserts take place right before
    SELECT 
        c.pubkey_id AS book_config,
        0 AS "close",
        0 AS "volume",
        0 AS "turnover",
        (86460) AS "timestamp"

    FROM order_book_config AS c
    LEFT JOIN pre_candle AS t ON t.book_config = c.pubkey_id
    AND t.timestamp = (86460)
    WHERE t.book_config IS NULL

    UNION 

    -- day offset
    -- fall back if no rows exist,
    -- when there is no data then this should take place
    -- necessary for initial 24 hours
    SELECT 
        c.pubkey_id AS book_config,
        0 AS "close",
        0 AS "volume",
        0 AS "turnover",
        ((86460) - 86400) AS "timestamp"

    FROM order_book_config AS c
    LEFT JOIN pre_candle AS t ON t.book_config = c.pubkey_id
    AND t.timestamp = ((86460) - 86400) 
    WHERE t.book_config IS NULL

    UNION
    SELECT * FROM pre_candle

), pre_trade_data AS (
    SELECT
        td.book_config,
        td.last_price,
        "24_hour_volume",
        "24_hour_turnover"

    FROM trade_data_24_hour AS td
    WHERE td.timestamp = ((86460) - 60)

), trade_data AS (
    SELECT 
        c.pubkey_id AS book_config,
        (
            SELECT 
                last_price 
            FROM candle AS c 
            WHERE c.timestamp = ((86460) - 60) 
        ) AS last_price,
        SUM(m.volume) AS "24_hour_volume",
        SUM(m.turnover) AS "24_hour_turnover"

    FROM order_book_config AS c
    LEFT JOIN pre_trade_data AS t ON t.book_config = c.pubkey_id
    JOIN market_order_history AS m ON m.book_config = c.pubkey_id
    WHERE t.book_config IS NULL 
    AND m.timestamp >= ((86460) - 86400) 
    AND m.timestamp <= (86460)
    GROUP BY GROUPING SETS (
        (1, 2)
    )

    UNION
    SELECT * FROM pre_trade_data

)

INSERT INTO trade_data_24_hour
SELECT 
    td.book_config,
    a.close AS last_price,
    "24_hour_volume" + a.volume - r.volume AS volume,
    "24_hour_turnover" + a.turnover - r.turnover AS turnover,
    -- im worried about interger overflow
    -- maybe this should be handled on client?
    -- (td.last_price - a.close) * 10000 / td.last_price AS "24_hour_change",
    CASE WHEN td.last_price IS NOT NULL
        THEN (td.last_price - a.close)
        ELSE 0
    END AS "24_hour_price_change",
    -- apply to "24_hour_price_change" to get 24h % change
    CASE WHEN td.last_price IS NOT NULL
        THEN td.last_price
        ELSE 0
    END AS "24_hour_prev_last_price",
    a.timestamp AS "timestamp"

FROM trade_data AS td
JOIN candle AS a ON a.book_config = td.book_config
JOIN candle AS r ON r.book_config = td.book_config
WHERE r.timestamp = ((86460) - 86400) AND a.timestamp = (86460);

COMMIT;