WITH market AS (
    SELECT 
        *
    FROM market_order_history AS m 
    WHERE m.book_config = 'BqN7dPo4LheezCRC2kSX5PEyXBRNswvBzLzH7P5w2PWK'
    AND m.interval = '1m'::interval
    ORDER BY m.timestamp DESC
    LIMIT 1000
    OFFSET 0

), agg AS (
    SELECT 
        m.book_config AS book_config,
        json_agg(
                json_build_object(
                    -- 'id', m.id,
                    'open', m.open,
                    'high', m.high,
                    'low', m.low,
                    'close', m.close,
                    'volume', m.volume,
                    'turnover', m.turnover,
                    'timestamp', m.timestamp
                )
            ) AS "data"

    FROM market AS m 
    WHERE m.book_config = 'BqN7dPo4LheezCRC2kSX5PEyXBRNswvBzLzH7P5w2PWK'
    GROUP BY m.book_config

), p AS (
    SELECT 
        DISTINCT m.book_config AS book_config,

        CASE
            WHEN m.interval = '1m'::interval THEN '1m'::TEXT
            WHEN m.interval = '2m'::interval THEN '2m'::TEXT
            WHEN m.interval = '5m'::interval THEN '5m'::TEXT
            WHEN m.interval = '10m'::interval THEN '10m'::TEXT
            WHEN m.interval = '15m'::interval THEN '15m'::TEXT
            WHEN m.interval = '20m'::interval THEN '20m'::TEXT
            WHEN m.interval = '30m'::interval THEN '30m'::TEXT
            WHEN m.interval = '1h'::interval THEN '1h'::TEXT
            WHEN m.interval = '2h'::interval THEN '2h'::TEXT
            WHEN m.interval = '3h'::interval THEN '3h'::TEXT
            WHEN m.interval = '4h'::interval THEN '4h'::TEXT
            WHEN m.interval = '6h'::interval THEN '6h'::TEXT
            WHEN m.interval = '8h'::interval THEN '8h'::TEXT
            WHEN m.interval = '12h'::interval THEN '12h'::TEXT
            WHEN m.interval = 'P1D'::interval THEN 'D'::TEXT
            WHEN m.interval = 'P2D'::interval THEN '2D'::TEXT
            WHEN m.interval = 'P3D'::interval THEN '3D'::TEXT
            WHEN m.interval = 'P1W'::interval THEN 'W'::TEXT
            WHEN m.interval = 'P2W'::interval THEN '2W'::TEXT
            WHEN m.interval = 'P3W'::interval THEN '3W'::TEXT
            WHEN m.interval = 'P1M'::interval THEN '1M'::TEXT
            WHEN m.interval = 'P2M'::interval THEN '2M'::TEXT
            WHEN m.interval = 'P3M'::interval THEN '3M'::TEXT
            WHEN m.interval = 'P4M'::interval THEN '4M'::TEXT
            WHEN m.interval = 'P6M'::interval THEN '6M'::TEXT
            WHEN m.interval = 'P12M'::interval THEN '12M'::TEXT
        END AS interval

    FROM market_order_history AS m 
    WHERE m.book_config = 'BqN7dPo4LheezCRC2kSX5PEyXBRNswvBzLzH7P5w2PWK'
    AND m.interval = '1m'::interval
    
)

SELECT 
    json_build_object(
        'orderBookConfig', p.book_config,
        'interval', p.interval,
        'market', m.data
    )

FROM agg AS m
JOIN p ON p.book_config = m.book_config;
