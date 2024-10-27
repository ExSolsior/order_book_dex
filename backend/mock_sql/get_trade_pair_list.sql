WITH config AS (
    SELECT * FROM order_book_config
    LIMIT 2
    OFFSET 0
    
), market_data AS (
    SELECT * FROM trade_data_24_hour as td
    WHERE td.timestamp = 0

)

SELECT
    json_agg(
        json_build_object(
            'pubkeyId', "pubkey_id",
            'tokenMintA', "token_mint_a", 
            'tokenMintB', "token_mint_b", 
            'tokenProgramA', "token_program_a", 
            'tokenProgramB', "token_program_b", 
            'sellMarketPointer', "sell_market", 
            'buyMarketPointer', "buy_market",
            'tokenDecimalsA', "token_decimals_a",
            'tokenDecimalsB', "token_decimals_b",
            'tokenSymbolA', "token_symbol_a",
            'tokenSymbolB', "token_symbol_b",
            'ticker', "ticker",
            'isReversal', "is_reverse",

            'marketData', json_build_object(
                'lastPrice',
                    CASE WHEN m.last_price IS NOT NULL
                        THEN m.last_price
                        ELSE 0
                    END,
                '24hVolume',
                    CASE WHEN "24_hour_volume" IS NOT NULL
                        THEN "24_hour_volume"
                        ELSE 0
                    END,
                '24hTurnover',
                    CASE WHEN "24_hour_turnover" IS NOT NULL
                        THEN "24_hour_turnover"
                        ELSE 0
                    END,
                '24hPriceChange',
                    CASE WHEN "24_hour_price_change" IS NOT NULL
                        THEN "24_hour_price_change"
                        ELSE 0
                    END,
                '24hPrevLastPrice',
                    CASE WHEN "24_hour_prev_last_price" IS NOT NULL
                        THEN "24_hour_prev_last_price"
                        ELSE 0
                    END,
                'timestamp', 
                    CASE WHEN m.timestamp IS NOT NULL
                        THEN m.timestamp
                        ELSE 0
                    END
            )
        )
    )

From config
LEFT JOIN market_data AS m ON m.book_config = config.pubkey_id;