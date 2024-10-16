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
);

CREATE TABLE IF NOT EXISTS order_book_config (
    "pubkey_id"                     varchar(44) PRIMARY KEY,
    "token_mint_a"                  varchar(44) NOT NULL, 
    "token_mint_b"                  varchar(44) NOT NULL, 
    "token_program_a"               varchar(44) NOT NULL, 
    "token_program_b"               varchar(44) NOT NULL, 
    "sell_market_pointer_pubkey"    varchar(44) NOT NULL, 
    "buy_market_pointer_pubkey"     varchar(44) NOT NULL, 
    "token_mint_a_decimal"          smallint NOT NULL,
    "token_mint_b_decimal"          smallint NOT NULL,
    "token_mint_a_symbol"           varchar(12) NOT NULL,
    "token_mint_b_symbol"           varchar(12) NOT NULL,
    "ticker"                        varchar(25) NOT NULL,
    "is_reverse"                    boolean NOT NULL
);

CREATE TABLE IF NOT EXISTS order_position_config (
    "pubkey_id"                 varchar(44) PRIMARY KEY,
    "order_book_config_pubkey"  varchar(44) NOT NULL REFERENCES order_book_config (pubkey_id),
    "market_maker_pubkye"       varchar(44) NOT NULL,
    "vault_a_pubkey"            varchar(44) NOT NULL,
    "vault_b_pubkey"            varchar(44) NOT NULL,
    "nonce"                     bigserial,
    "reference"                 bigserial
);

CREATE TABLE IF NOT EXISTS order_position (
    "pubkey_id"                         varchar(44) PRIMARY KEY,
    "order_type"                        order_type NOT NULL,
    "price"                             bigserial NOT NULL,
    "size"                              bigserial NOT NULL,
    "is_available"                      boolean NOT NULL,
    "next_order_position_pubkey"        varchar(44) NOT NULL,
    "order_position_config_pubkey"      varchar(44) NOT NULL REFERENCES order_position_config (pubkey_id),
    "slot"                              bigserial NOT NULL,
    "timestamp"                         bigserial NOT NULL
);

-- real time data
CREATE TABLE IF NOT EXISTS real_time_trade_data (
    "id"                        bigserial PRIMARY KEY,
    "order_book_config_pubkey"  varchar(44) NOT NULL REFERENCES order_book_config (pubkey_id),
    "order_type"                order_type NOT NULL,
    "last_price"                bigserial NOT NULL,
    "avg_price"                 bigserial NOT NULL,
    "amount"                    bigserial NOT NULL,
    "turnover"                  bigserial NOT NULL,
    "timestamp"                 bigserial NOT NULL,
    "slot"                      bigserial NOT NULL
);

CREATE TABLE IF NOT EXISTS market_order_history (
    "id"                        bigserial PRIMARY KEY,
    "order_book_config_pubkey"  varchar(44) NOT NULL REFERENCES order_book_config (pubkey_id),
    "interval"                  interval NOT NULL,
    "open"                      bigserial NOT NULL,
    "high"                      bigserial NOT NULL,
    "low"                       bigserial NOT NULL,
    "close"                     bigserial NOT NULL,
    "volume"                    bigserial NOT NULL,
    "turnover"                  bigserial NOT NULL,
    "timestamp"                 bigserial NOT NULL
);

