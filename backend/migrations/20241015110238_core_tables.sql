CREATE TYPE order_type as ENUM (
    'buy',
    'sell',
    'bid',
    'ask'
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
    "token_decimals_a"       smallint NOT NULL,
    "token_decimals_b"       smallint NOT NULL,
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
    "nonce"                 bigserial,
    "reference"             bigserial
);

CREATE TABLE IF NOT EXISTS order_position (
    "pubkey_id"             varchar(44) PRIMARY KEY,
    "book_config"           varchar(44) NOT NULL REFERENCES order_book_config (pubkey_id),
    "position_config"       varchar(44) NOT NULL REFERENCES order_position_config (pubkey_id),
    "next_position"         varchar(44),
    "source_vault"          varchar(44) NOT NULL,
    "destination_vault"     varchar(44) NOT NULL,
    "order_type"            order_type NOT NULL,
    "price"                 bigserial NOT NULL,
    "size"                  bigserial NOT NULL,
    "is_available"          boolean NOT NULL,
    "slot"                  bigserial NOT NULL,
    "timestamp"             bigserial NOT NULL
);

-- real time data
CREATE TABLE IF NOT EXISTS real_time_trade_data (
    "id"                    bigserial PRIMARY KEY,
    "book_config"           varchar(44) NOT NULL REFERENCES order_book_config (pubkey_id),
    "order_type"            order_type NOT NULL,
    "last_price"            bigserial NOT NULL,
    "avg_price"             bigserial NOT NULL,
    "amount"                bigserial NOT NULL,
    "turnover"              bigserial NOT NULL,
    "timestamp"             bigserial NOT NULL,
    "slot"                  bigserial NOT NULL
);

-- WIP
-- CREATE TABLE IF NOT EXIST trade_data_24_hour (
--     "book_config_id"
--     "last_price"
--     "24_hour_volume"
--     "24_hour_turnover"
-- );

CREATE TABLE IF NOT EXISTS market_order_history (
    "id"                    bigserial PRIMARY KEY,
    "book_config"           varchar(44) NOT NULL REFERENCES order_book_config (pubkey_id),
    "interval"              interval NOT NULL,
    "open"                  bigserial NOT NULL,
    "high"                  bigserial NOT NULL,
    "low"                   bigserial NOT NULL,
    "close"                 bigserial NOT NULL,
    "volume"                bigserial NOT NULL,
    "turnover"              bigserial NOT NULL,
    "timestamp"             bigserial NOT NULL
);

