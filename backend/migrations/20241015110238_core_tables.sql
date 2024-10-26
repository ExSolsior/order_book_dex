CREATE TYPE order_type as ENUM (
    'sell',
    'buy',
    'ask',
    'bid'
);

-- CREATE TYPE tab AS ENUM (
--     'popular',
--     'new_listings',
--     'top_gainers'
-- );

-- CREATE TYPE interval_type as ENUM (
--     '1m', '2m', '5m', '10m', '15m', 
--     '20m', '30m', '1h', '2h', '3h', 
--     '4h', '6h', '8h', '12h', 'D', 
--     '2D', '3D', 'W', '2W', '3W',  
--     'M', '2M', '3M', '4M', '6M',
--     '12M'
-- );

CREATE TABLE IF NOT EXISTS order_book_config (
    "pubkey_id"             varchar(44) PRIMARY KEY,
    "token_mint_a"          varchar(44) NOT NULL, 
    "token_mint_b"          varchar(44) NOT NULL, 
    "token_program_a"       varchar(44) NOT NULL, 
    "token_program_b"       varchar(44) NOT NULL, 
    "sell_market"           varchar(44) NOT NULL, 
    "buy_market"            varchar(44) NOT NULL,
    "token_decimals_a"      smallint NOT NULL,
    "token_decimals_b"      smallint NOT NULL,
    "token_symbol_a"        varchar(12) NOT NULL,
    "token_symbol_b"        varchar(12) NOT NULL,
    "ticker"                varchar(25) NOT NULL,
    "is_reverse"            boolean NOT NULL
);

-- WIP
-- CREATE TABLE IF EXISTS book_activity (
--     "pubkey_id"             varchar(44) PRIMARY KEY REFERENCES order_book_config (pubkey_id),
--     "tab"                   tab
-- );

CREATE TABLE IF NOT EXISTS order_position_config (
    "pubkey_id"             varchar(44) PRIMARY KEY,
    "book_config"           varchar(44) NOT NULL REFERENCES order_book_config (pubkey_id),
    "market_maker"          varchar(44) NOT NULL,
    "capital_a"             varchar(44) NOT NULL,
    "capital_b"             varchar(44) NOT NULL,
    "vault_a"               varchar(44) NOT NULL,
    "vault_b"               varchar(44) NOT NULL,
    "nonce"                 bigint,
    "reference"             bigint
);

CREATE TABLE IF NOT EXISTS order_position (
    "pubkey_id"             varchar(44) PRIMARY KEY,
    -- not sure if needed, it's being derived from position config
    "book_config"           varchar(44) NOT NULL REFERENCES order_book_config (pubkey_id),
    "position_config"       varchar(44) NOT NULL REFERENCES order_position_config (pubkey_id),
    "next_position"         varchar(44),
    -- not sure if needed, it's being derived from position config
    "source_vault"          varchar(44) NOT NULL,   
    -- not sure if needed, it's being derived from position config
    "destination_vault"     varchar(44) NOT NULL,   
    "order_type"            order_type NOT NULL,
    "price"                 bigint NOT NULL,
    "size"                  bigint NOT NULL,
    "is_available"          boolean NOT NULL,
    "slot"                  bigint NOT NULL,
    "timestamp"             bigint NOT NULL
);

-- real time data
CREATE TABLE IF NOT EXISTS real_time_trade_data (
    "book_config"           varchar(44) NOT NULL REFERENCES order_book_config (pubkey_id),
    "order_type"            order_type NOT NULL,
    "last_price"            bigint NOT NULL,
    "avg_price"             bigint NOT NULL,
    "amount"                bigint NOT NULL,
    "turnover"              bigint NOT NULL,
    "timestamp"             bigint NOT NULL,
    "slot"                  bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS trade_data_24_hour (
    "book_config"           varchar(44) NOT NULL REFERENCES order_book_config (pubkey_id),
    "last_price"            bigint NOT NULL,
    "24_hour_volume"        bigint NOT NULL,
    "24_hour_turnover"      bigint NOT NULL,
    "24_hour_price_change"  bigint NOT NULL,
    "timestamp"             bigint NOT NULL,

    UNIQUE ("book_config", "timestamp")
);

CREATE TABLE IF NOT EXISTS market_order_history (
    "book_config"           varchar(44) NOT NULL REFERENCES order_book_config (pubkey_id),
    "interval"              interval NOT NULL,
    "open"                  bigint NOT NULL,
    "high"                  bigint NOT NULL,
    "low"                   bigint NOT NULL,
    "close"                 bigint NOT NULL,
    "volume"                bigint NOT NULL,
    "turnover"              bigint NOT NULL,
    "timestamp"             bigint NOT NULL,

    UNIQUE ("book_config", "timestamp")
);

