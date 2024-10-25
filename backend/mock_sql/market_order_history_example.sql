WITH market AS (
    SELECT * FROM market_order_history AS m 
    WHERE m.book_config = 'BqN7dPo4LheezCRC2kSX5PEyXBRNswvBzLzH7P5w2PWK'
    AND m.interval = '1m'::interval
    ORDER BY m.timestamp DESC
    LIMIT 1000
    OFFSET 0;
), p AS (
    SELECT 
        DISTINCT m.book_config AS book_config,
        CASE
            WHERE p.interval = 'T1m'::interval THEN '1m'::TEXT,
            WHERE p.interval = 'T2m'::interval THEN '2m'::TEXT,
            WHERE p.interval = 'T5m'::interval THEN '5m'::TEXT,
            WHERE p.interval = 'T10m'::interval THEN '10m'::TEXT,
            WHERE p.interval = 'T15m'::interval THEN '15m'::TEXT,
            WHERE p.interval = 'T20m'::interval THEN '20m'::TEXT,
            WHERE p.interval = 'T30m'::interval THEN '30m'::TEXT,
            WHERE p.interval = 'T1h'::interval THEN '1h'::TEXT,
            WHERE p.interval = 'T2h'::interval THEN '2h'::TEXT,
            WHERE p.interval = 'T3h'::interval THEN '3h'::TEXT,
            WHERE p.interval = 'T4h'::interval THEN '4h'::TEXT,
            WHERE p.interval = 'T6h'::interval THEN '6h'::TEXT,
            WHERE p.interval = 'T8h'::interval THEN '8h'::TEXT,
            WHERE p.interval = 'T12h'::interval THEN '12h'::TEXT,
            WHERE p.interval = 'PD'::interval THEN 'D'::TEXT,
            WHERE p.interval = 'P2D'::interval THEN '2D'::TEXT,
            WHERE p.interval = 'P3D'::interval THEN '3D'::TEXT,
            WHERE p.interval = 'PW'::interval THEN 'W'::TEXT,
            WHERE p.interval = 'P2W'::interval THEN '2W'::TEXT,
            WHERE p.interval = 'P3W'::interval THEN '3W'::TEXT,
            WHERE p.interval = 'P1M'::interval THEN '1M'::TEXT,
            WHERE p.interval = 'P2M'::interval THEN '2M'::TEXT,
            WHERE p.interval = 'P3M'::interval THEN '3M'::TEXT,
            WHERE p.interval = 'P4M'::interval THEN '4M'::TEXT,
            WHERE p.interval = 'P6M'::interval THEN '6M'::TEXT,
            WHERE p.interval = 'P12M'::interval THEN '12M'::TEXT,
        END AS interval

    FROM market_order_history AS m 
    WHERE m.book_config = 'BqN7dPo4LheezCRC2kSX5PEyXBRNswvBzLzH7P5w2PWK'
    AND m.interval = '1m'::interval
    
)

SELECT 
    json_build_object(
        'orderBookConfig', p.book_config,
        'interval', p.interval,
        'market', json_agg(
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
        )
    )

FROM market AS m
JOIN p ON p.book_config = m.book_config;
