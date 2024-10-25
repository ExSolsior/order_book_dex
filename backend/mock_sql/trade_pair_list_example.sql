WITH config AS (
    SELECT * FROM order_book_config
    LIMIT 100
    OFFSET 0
    
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
            'isReversal', "is_reverse"
        )
    )

From config;