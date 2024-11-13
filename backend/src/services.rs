use {
    crate::{
        db::models::{
            self, delete_order_position, delete_real_trade, get_market_order_history,
            get_trade_pair, get_trade_pair_list, insert_market_order_history,
            insert_order_position, insert_order_position_config, insert_real_time_trade,
            insert_trade_pair, update_order_position, OrderPosition, PositionConfig, RealTimeTrade,
        },
        transactions::{
            self, cancel_limit_order::CancelLimitOrderParams,
            execute_market_order::MarketOrderParams, open_limit_order::OpenLimitOrderParams,
        },
        AppState, POOL,
    },
    actix_web::{get, web, HttpResponse, Responder},
    base64::engine::{general_purpose, Engine},
    order_book_dex::state::{Fill, Order},
    serde::Deserialize,
    solana_rpc_client_api::response::{Response, RpcLogsResponse},
    solana_sdk::pubkey::Pubkey,
    std::str::FromStr,
};

#[derive(Debug, Deserialize)]
pub struct ExecuteMarketOrder {
    pub signer: String,
    pub position_config: String,
    pub book_config: String,
    pub order_type: String,
    pub target_price: Option<u64>,
    pub target_amount: u64,
}

#[derive(Debug, Deserialize)]
pub struct LimitOrder {
    pub book_config: String,
    pub signer: String,
    pub order_position: Option<String>,
    pub next_pointer: Option<String>,
    pub order_type: String,
    pub price: Option<u64>,
    pub amount: Option<u64>,
    pub nonce: Option<u64>,
}

#[derive(Debug, Deserialize)]
pub struct MarketTradeQuery {
    pub book_config: String,
    pub interval: String,
    pub limit: u64,
    pub offset: u64,
}

#[derive(Debug, Deserialize)]
pub struct TradePair {
    pub book_config: String,
}

#[derive(Debug, Deserialize)]
pub struct TradePairList {
    pub limit: u64,
    pub offset: u64,
}

#[derive(Debug, Deserialize)]
pub struct OpenPositions {
    pub market_maker: String,
}

#[get("/market_order_book")]
pub async fn market_order_book(
    query: web::Query<TradePair>,
    app_state: web::Data<AppState>,
) -> impl Responder {
    match get_trade_pair(
        &Pubkey::from_str(&query.book_config).unwrap(),
        &Option::<Pubkey>::None,
        app_state,
    )
    .await
    {
        Ok(data) =>
        // should should as structured message
        {
            HttpResponse::Ok().json(data)
        }

        Err(error) =>
        // should send as structured error message
        {
            println!("{:?}", error);
            HttpResponse::BadRequest().into()
        }
    }
}

#[get("/market_history")]
pub async fn market_history(
    query: web::Query<MarketTradeQuery>,
    app_state: web::Data<AppState>,
) -> impl Responder {
    // let interval = match query.interval.as_str() {
    //     "1m" => PgInterval::try_from(Duration::from_secs(60)),
    //     _ => PgInterval::try_from(Duration::from_secs(60)),
    // };

    println!("{:?}", query);

    match get_market_order_history(
        Pubkey::from_str(&query.book_config).unwrap(),
        // interval.unwrap(),
        query.interval.clone(),
        query.limit,
        query.offset,
        app_state,
    )
    .await
    {
        Ok(data) => HttpResponse::Ok().json(data),
        Err(error) => {
            println!("{}", error);
            HttpResponse::BadRequest().into()
        }
    }
}

#[get("/market_list")]
pub async fn market_list(
    query: web::Query<TradePairList>,
    app_state: web::Data<AppState>,
) -> impl Responder {
    match get_trade_pair_list(query.limit, query.offset, app_state).await {
        Ok(data) => {
            println!("{:?}", data);
            HttpResponse::Ok().json(data)
        }
        Err(error) => {
            println!("{:?}", error);
            HttpResponse::BadRequest().into()
        }
    }
}

#[get("/get_open_positions")]
pub async fn get_open_positions(
    query: web::Query<OpenPositions>,
    app_state: web::Data<AppState>,
) -> impl Responder {
    let market_maker = Pubkey::from_str(&query.market_maker).unwrap();

    match models::get_open_positions(market_maker, app_state).await {
        Ok(data) => {
            println!("{:?}", data);
            HttpResponse::Ok().json(data)
        }
        Err(error) => {
            println!("{:?}", error);
            HttpResponse::BadRequest().into()
        }
    }
}

#[get("/open_limit_order")]
pub async fn open_limit_order(
    query: web::Query<LimitOrder>,
    app_state: web::Data<AppState>,
) -> impl Responder {
    let order_type = match query.order_type.as_str() {
        "ask" => Order::Ask,
        "bid" => Order::Bid,
        _ => return HttpResponse::BadRequest().body("Invalid Order Type"),
    };

    if !(query.price.is_some() && query.amount.is_some() && query.nonce.is_some()) {
        return HttpResponse::BadRequest().body("Missing Params");
    }

    let next_position_pointer = query
        .next_pointer
        .is_some()
        .then(|| Pubkey::from_str(&query.next_pointer.as_ref().unwrap()).unwrap());

    let limit_order = OpenLimitOrderParams {
        order_book_config: Pubkey::from_str(&query.book_config).unwrap(),
        signer: Pubkey::from_str(&query.signer).unwrap(),
        next_position_pointer,
        order_type,
        price: query.price.unwrap(),
        amount: query.amount.unwrap(),
        nonce: query.nonce.unwrap(),
    };

    match transactions::open_limit_order::open_limit_order(app_state, limit_order).await {
        Ok(tx) => HttpResponse::Ok().json(tx),
        Err(_) => HttpResponse::BadRequest().into(),
    }
}

#[get("/cancel_limit_order")]
pub async fn cancel_limit_order(
    query: web::Query<LimitOrder>,
    app_state: web::Data<AppState>,
) -> impl Responder {
    let order_type = match query.order_type.as_str() {
        "ask" => Order::Ask,
        "bid" => Order::Bid,
        _ => return HttpResponse::BadRequest().body("Invalid Order Type"),
    };

    let limit_order = CancelLimitOrderParams {
        order_book_config: Pubkey::from_str(&query.book_config).unwrap(),
        signer: Pubkey::from_str(&query.signer).unwrap(),
        order_position: Pubkey::from_str(&query.order_position.as_ref().unwrap()).unwrap(),
        order_type,
    };

    match transactions::cancel_limit_order::cancel_limit_order(app_state, limit_order).await {
        Ok(data) => HttpResponse::Ok().json(data),
        Err(_) => HttpResponse::BadRequest().into(),
    }
}

#[get("execute_market_order")]
pub async fn execute_market_order(
    query: web::Query<ExecuteMarketOrder>,
    app_state: web::Data<AppState>,
) -> impl Responder {
    let order_type = match query.order_type.as_str() {
        "sell" => Order::Sell,
        "buy" => Order::Buy,
        _ => return HttpResponse::BadRequest().body("Invalid Order Type"),
    };

    let fill = match query.target_price {
        Some(target_price) => Fill::Partial { target_price },
        None => Fill::Full,
    };

    let market_order = MarketOrderParams {
        signer: Pubkey::from_str(&query.signer).unwrap(),
        position_config: Pubkey::from_str(&query.position_config).unwrap(),
        order_book_config: Pubkey::from_str(&query.book_config).unwrap(),
        order_type,
        fill,
        target_amount: query.target_amount,
    };

    match transactions::execute_market_order::execute_market_order(app_state, market_order).await {
        Ok(data) =>
        // should should as structured message
        {
            println!("{:?}", data);
            HttpResponse::Ok().json(data)
        }

        Err(error) =>
        // should send as structured error message
        {
            println!("{:?}", error);
            HttpResponse::BadRequest().into()
        }
    }
}

#[get("/sanity_check")]
pub async fn sanity_check() -> impl Responder {
    HttpResponse::Ok().body("it works")
}

pub async fn scheduled_process() {
    let pool = POOL.get().unwrap();

    insert_market_order_history(&pool).await;
    delete_real_trade(&pool).await;
}

pub async fn logs_handler(logs_info: Response<RpcLogsResponse>, app_state: AppState) {
    let logs = logs_info.value.logs;
    // println!("{:?}", logs);

    // const PROGRAM_LOG = "Program log: ";
    // const PROGRAM_DATA = "Program data: ";
    // const PROGRAM_LOG_START_INDEX = PROGRAM_LOG.length;
    // const PROGRAM_DATA_START_INDEX = PROGRAM_DATA.length;

    // Program data:
    let start = String::from("Program data: ").len();

    for data in logs.iter().filter(|log| log.starts_with("Program data: ")) {
        decode(&data[start..].to_string(), &app_state).await;
    }
    // match logs.iter().find(|log| log.starts_with("Program data: ")) {
    //     Some(data) => decode(&data[start..].to_string(), app_state).await,
    //     _ => println!("error"),
    // }
}

const CANCEL_LIMIT_ORDER_EVENT: [u8; 8] = [216, 16, 162, 254, 206, 149, 207, 36];
const CLOSE_LIMIT_ORDER_EVENT: [u8; 8] = [37, 48, 113, 193, 242, 130, 158, 58];
const CREATE_ORDER_POSITION_EVENT: [u8; 8] = [172, 251, 54, 147, 127, 165, 156, 166];
const MARKET_ORDER_COMPLETE_EVENT: [u8; 8] = [117, 159, 39, 123, 213, 191, 30, 5];
const MARKET_ORDER_FILL_EVENT: [u8; 8] = [154, 188, 223, 75, 178, 109, 84, 46];
const MARKET_ORDER_TRIGGER_EVENT: [u8; 8] = [72, 184, 141, 82, 42, 180, 101, 73];
const NEW_ORDER_BOOK_CONFIG_EVENT: [u8; 8] = [212, 127, 42, 69, 195, 133, 17, 145];
const NEW_ORDER_POSITION_CONFIG_EVENT: [u8; 8] = [135, 248, 180, 220, 179, 224, 202, 103];
const OPEN_LIMIT_ORDER_EVENT: [u8; 8] = [106, 24, 71, 85, 57, 169, 158, 216];

pub async fn decode(data: &String, app_state: &AppState) {
    let decoded = general_purpose::STANDARD.decode(data).unwrap();
    let discriminator = decoded[..8].try_into().expect("u8 array size 8");

    println!("{}", data);
    println!("{:?}, {}", decoded, decoded.len());

    match discriminator {
        NEW_ORDER_BOOK_CONFIG_EVENT => parse_order_book_event(&decoded, app_state).await,
        NEW_ORDER_POSITION_CONFIG_EVENT => {
            parse_order_position_config_event(&decoded, app_state).await
        }
        CREATE_ORDER_POSITION_EVENT => {
            _parse_create_order_position_event(&decoded, app_state).await
        }
        OPEN_LIMIT_ORDER_EVENT => parse_open_limit_order_event(&decoded, app_state).await,
        CANCEL_LIMIT_ORDER_EVENT => parse_cancel_limit_order_event(&decoded, app_state).await,
        CLOSE_LIMIT_ORDER_EVENT => _parse_close_limit_order_event(&decoded, app_state).await,
        MARKET_ORDER_TRIGGER_EVENT => _parse_market_order_trigger_event(&decoded, app_state).await,
        MARKET_ORDER_FILL_EVENT => parse_market_order_fill_event(&decoded, app_state).await,
        MARKET_ORDER_COMPLETE_EVENT => parse_market_order_complete_event(&decoded, app_state).await,
        _ => println!("Invalid Event, log invalid event?"),
    };
}

// insert
pub async fn parse_order_book_event(data: &[u8], app_state: &AppState) {
    let mut offset = 8;

    let book_config = get_pubkey(&data, &mut offset);
    let token_mint_a = get_pubkey(&data, &mut offset);
    let token_mint_b = get_pubkey(&data, &mut offset);
    let token_program_a = get_pubkey(&data, &mut offset);
    let token_program_b = get_pubkey(&data, &mut offset);
    let sell_market_pointer = get_pubkey(&data, &mut offset);
    let buy_market_pointer = get_pubkey(&data, &mut offset);
    let token_symbol_a = get_symbol(&data, &mut offset);
    let token_symbol_b = get_symbol(&data, &mut offset);
    let token_decimals_a = get_decimals(&data, &mut offset);
    let token_decimals_b = get_decimals(&data, &mut offset);
    let is_reverse = get_reverse(&data, &mut offset);
    // let slot = get_slot(&data, &mut offset);
    // let timestamp = get_timestamp(&data, &mut offset);

    let ticker = if !is_reverse {
        format!("{}/{}", token_symbol_a, token_symbol_b)
    } else {
        format!("{}/{}", token_symbol_b, token_symbol_a)
    };

    insert_trade_pair(
        crate::db::models::TradePair {
            pubkey_id: book_config,
            token_mint_a: token_mint_a,
            token_mint_b: token_mint_b,
            token_program_a: token_program_a,
            token_program_b: token_program_b,

            sell_market: sell_market_pointer,
            buy_market: buy_market_pointer,

            token_symbol_a: token_symbol_a.to_string(),
            token_symbol_b: token_symbol_b.to_string(),
            ticker: ticker,
            token_decimals_a: token_decimals_a,
            token_decimals_b: token_decimals_b,
            is_reverse,
        },
        app_state,
    )
    .await;
}

// insert
pub async fn parse_order_position_config_event(data: &[u8], app_state: &AppState) {
    let mut offset = 8;
    let book_config = get_pubkey(&data, &mut offset);
    let pos_config = get_pubkey(&data, &mut offset);
    let market_maker = get_pubkey(&data, &mut offset);
    let capital_a = get_pubkey(&data, &mut offset);
    let capital_b = get_pubkey(&data, &mut offset);
    let vault_a = get_pubkey(&data, &mut offset);
    let vault_b = get_pubkey(&data, &mut offset);
    // let slot = get_slot(&data, &mut offset);
    // let timestamp = get_timestamp(&data, &mut offset);

    insert_order_position_config(
        PositionConfig {
            pubkey_id: pos_config,
            book_config: book_config,
            market_maker: market_maker,
            capital_a: capital_a,
            capital_b: capital_b,
            vault_a: vault_a,
            vault_b: vault_b,
        },
        app_state,
    )
    .await;
}

// don't think it's needed
pub async fn _parse_create_order_position_event(data: &[u8], _app_state: &AppState) {
    let mut offset = 8;
    let _book_config = get_pubkey(&data, &mut offset);
    let _pos_config = get_pubkey(&data, &mut offset);
    let _pos_pubkey = get_pubkey(&data, &mut offset);
    let _order_type = get_order_type(&data, &mut offset);
}

// insert
pub async fn parse_open_limit_order_event(data: &[u8], app_state: &AppState) {
    let mut offset = 8;
    let pos_pubkey = get_pubkey(&data, &mut offset);
    let book_config = get_pubkey(&data, &mut offset);
    let pos_config = get_pubkey(&data, &mut offset);
    let source = get_pubkey(&data, &mut offset);
    let destination = get_pubkey(&data, &mut offset);
    let parent_position = get_option_pubkey(&data, &mut offset);
    let next_pos_pubkey = get_option_pubkey(&data, &mut offset);
    let order_type = get_order_type(&data, &mut offset);
    let price = get_slot(&data, &mut offset);
    let size = get_slot(&data, &mut offset);
    let slot = get_slot(&data, &mut offset);
    let timestamp = get_timestamp(&data, &mut offset);
    let is_available = get_reverse(&data, &mut offset);
    let is_head = get_head(&data, &mut offset);

    // should call OrderPosition as LimitOrder
    insert_order_position(
        OrderPosition {
            pubkey_id: pos_pubkey,
            book_config: book_config,
            order_type: order_type,
            price: price,
            size: size,
            is_available: is_available,
            parent_position,
            next_position: next_pos_pubkey,
            position_config: pos_config,
            source_vault: source,
            destination_vault: destination,
            slot: slot,
            timestamp: timestamp as u64,
            is_head,
        },
        app_state,
    )
    .await;
}

// delete
pub async fn parse_cancel_limit_order_event(data: &[u8], app_state: &AppState) {
    let mut offset = 8;
    let pos_pubkey = get_pubkey(&data, &mut offset);
    let _book_config = get_pubkey(&data, &mut offset);
    let _pos_config = get_pubkey(&data, &mut offset);
    let _amount = get_slot(&data, &mut offset);
    let is_available = get_reverse(&data, &mut offset);

    if is_available {
        delete_order_position(pos_pubkey, app_state).await;
    }
}

// delete -> but cancel is handling it so not needed
pub async fn _parse_close_limit_order_event(data: &[u8], _app_state: &AppState) {
    let mut offset = 8;
    let _pos_pubkey = get_pubkey(&data, &mut offset);
    let _book_config = get_pubkey(&data, &mut offset);
    let _pos_config = get_pubkey(&data, &mut offset);
}

// don't think it's needed
pub async fn _parse_market_order_trigger_event(data: &[u8], _app_state: &AppState) {
    let mut offset = 8;
    let _market_pointer = get_pubkey(&data, &mut offset);
    let _book_config = get_pubkey(&data, &mut offset);
    let _next_pos_pubkey = get_option_pubkey(&data, &mut offset);
    let _order_type = get_order_type(&data, &mut offset);
    let _is_available = get_reverse(&data, &mut offset);
    let _slot = get_slot(&data, &mut offset);
    let _timestamp = get_timestamp(&data, &mut offset);
}

// update
pub async fn parse_market_order_fill_event(data: &[u8], app_state: &AppState) {
    let mut offset = 8;
    let _market_pointer = get_pubkey(&data, &mut offset);
    let _book_config = get_pubkey(&data, &mut offset);
    let pos_pubkey = get_pubkey(&data, &mut offset);
    let _order_type = get_order_type(&data, &mut offset);
    let _price = get_slot(&data, &mut offset);
    let _total = get_slot(&data, &mut offset);
    let _amount = get_slot(&data, &mut offset);
    let new_size = get_slot(&data, &mut offset);
    let _is_available = get_reverse(&data, &mut offset);
    let _slot = get_slot(&data, &mut offset);
    let _timestamp = get_timestamp(&data, &mut offset);

    let is_available = if new_size == 0 { false } else { true };

    update_order_position(pos_pubkey, new_size, is_available, app_state).await;
}

// insert -> other?
pub async fn parse_market_order_complete_event(data: &[u8], app_state: &AppState) {
    let mut offset = 8;
    let _market_pointer = get_pubkey(&data, &mut offset);
    let book_config = get_pubkey(&data, &mut offset);
    let _new_pointer = get_option_pubkey(&data, &mut offset);
    let order_type = get_order_type(&data, &mut offset);
    let total_cost = get_slot(&data, &mut offset);
    let total_amount = get_slot(&data, &mut offset);
    let last_price = get_slot(&data, &mut offset);
    let _is_available = get_reverse(&data, &mut offset);
    let slot = get_slot(&data, &mut offset);
    let timestamp = get_timestamp(&data, &mut offset);

    insert_real_time_trade(
        RealTimeTrade {
            book_config: book_config.to_string(),
            order_type: order_type,
            last_price,
            avg_price: total_cost / total_amount,
            amount: total_amount,
            turnover: total_cost,
            timestamp: timestamp as u64,
            slot,
        },
        app_state,
    )
    .await;
}

pub fn get_pubkey(data: &[u8], offset: &mut u64) -> Pubkey {
    let start = offset.clone() as usize;
    let length = 32;
    let end = start + length as usize;

    *offset += length;

    let pubkey = Pubkey::new_from_array(
        data[start..end]
            .try_into()
            .expect("expect u8 array 32 bytes"),
    );

    return pubkey;
}

pub fn get_option_pubkey(data: &[u8], offset: &mut u64) -> Option<Pubkey> {
    let length = 1;
    let is_option = u8::from_be_bytes([data[*offset as usize]]);
    *offset += length;

    if is_option != 1 {
        return None;
    }

    let start = offset.clone() as usize;
    let length = 32;
    let end = start + length as usize;

    *offset += length;

    let pubkey = Pubkey::new_from_array(
        data[start..end]
            .try_into()
            .expect("expect u8 array 32 bytes"),
    );

    Some(pubkey)
}

pub fn get_order_type(data: &[u8], offset: &mut u64) -> String {
    let length = 1;
    let index = u8::from_be_bytes([data[*offset as usize]]);
    *offset += length;

    // need to conert to enum Order type and impl to_string on the Order tyep
    match index {
        0 => String::from("buy"),
        1 => String::from("sell"),
        2 => String::from("bid"),
        3 => String::from("ask"),
        _ => String::from("invalid enum"),
    }
}

pub fn get_symbol(data: &[u8], offset: &mut u64) -> String {
    let start = offset.clone() as usize;
    let length = 4;
    let end = start + length as usize;

    let size = u32::from_le_bytes(data[start..end].try_into().expect("slice")) as usize;

    let start = end;
    let end = start + size;

    *offset += (length + size) as u64;

    return String::from_utf8(data[start..end].to_vec()).unwrap();
}

pub fn get_decimals(data: &[u8], offset: &mut u64) -> u8 {
    let length = 1;
    let value = u8::from_be_bytes([data[*offset as usize]]);
    *offset += length;
    return value;
}

pub fn get_reverse(data: &[u8], offset: &mut u64) -> bool {
    let length = 1;
    let flag = u8::from_be_bytes([data[*offset as usize]]);
    *offset += length;

    flag != 0
}

pub fn get_head(data: &[u8], offset: &mut u64) -> bool {
    let length = 1;
    let flag = u8::from_be_bytes([data[*offset as usize]]);
    *offset += length;

    flag != 0
}

pub fn get_slot(data: &[u8], offset: &mut u64) -> u64 {
    let length = 8;
    let num = u64::from_le_bytes(
        data[*offset as usize..(*offset + length) as usize]
            .try_into()
            .expect("expects to be u64"),
    );
    *offset += length;

    return num;
}

pub fn get_timestamp(data: &[u8], offset: &mut u64) -> i64 {
    let length = 8;
    let num = i64::from_le_bytes(
        data[*offset as usize..(*offset + length) as usize]
            .try_into()
            .expect("expects to i64"),
    );

    *offset += length;

    return num;
}
