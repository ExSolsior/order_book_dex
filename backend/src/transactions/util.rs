// use std::str::FromStr;

use order_book_dex::state::Order;
use solana_client::nonblocking::rpc_client::RpcClient;
use solana_sdk::{
    commitment_config::CommitmentConfig,
    instruction::Instruction,
    message::{v0::Message, VersionedMessage},
    pubkey::Pubkey,
    signature::NullSigner,
    transaction::VersionedTransaction,
};

use crate::db::models::OrderPosition;

use super::{constants::RPC_ENDPOINT, error::TransactionBuildError};

pub async fn create_versioned_tx(
    rpc_client: &RpcClient,
    payer: &Pubkey,
    ixs: &[Instruction],
) -> Result<VersionedTransaction, TransactionBuildError> {
    let recent_blockhash = rpc_client.get_latest_blockhash().await?;
    Ok(VersionedTransaction::try_new(
        VersionedMessage::V0(Message::try_compile(payer, ixs, &[], recent_blockhash)?),
        &[&NullSigner::new(payer)],
    )
    .unwrap())
}

pub fn create_rpc_client() -> RpcClient {
    RpcClient::new_with_commitment(RPC_ENDPOINT.to_string(), CommitmentConfig::confirmed())
}

pub fn get_market_pointer(
    buy_market_pointer_pubkey: Pubkey,
    sell_market_pointer_pubkey: Pubkey,
    order_type: Order,
    price: u64,
    min_price: Option<u64>,
    max_price: Option<u64>,
) -> (Pubkey, bool) {
    match order_type {
        Order::Bid => {
            if max_price.map_or(true, |max| price > max) {
                // Write to sell pointer if no max price or price is greater than max
                (sell_market_pointer_pubkey, true)
            } else {
                // Read from sell pointer if price is less than or equal to max
                (sell_market_pointer_pubkey, false)
            }
        }
        Order::Ask => {
            if min_price.map_or(true, |min| price < min) {
                // Write to buy pointer if no min price or price is less than min
                (buy_market_pointer_pubkey, true)
            } else {
                // Read from buy pointer if price is greater than or equal to min
                (buy_market_pointer_pubkey, false)
            }
        }
        // Wont handle buy and sell
        _ => unreachable!(),
    }
}

pub fn find_prev_next_entries(
    order_type: Order,
    order_price: u64,
    order_book_entries: String,
) -> (Option<Pubkey>, Option<Pubkey>) {
    // TODO: Fix double parsing once backend data is changed
    let order_book_entries =
        serde_json::from_str::<Vec<OrderPosition>>(&order_book_entries).unwrap();

    let is_bid = order_type == Order::Bid;

    // Filter based on the provided order type (Bid or Ask)
    let filtered_orders: Vec<&OrderPosition> = order_book_entries
        .iter()
        .filter(|order| order.order_type == if is_bid { "bid" } else { "ask" })
        .collect();

    // Sort by price, descending for Bid and ascending for Ask
    let mut sorted_order_book = filtered_orders.clone();
    sorted_order_book.sort_by(|a, b| {
        match order_type {
            Order::Bid => b.price.cmp(&a.price), // descending for Bid
            Order::Ask => a.price.cmp(&b.price),
            _ => unreachable!(),
        }
    });

    // Use binary search to find the position where the order fits
    let position = sorted_order_book
        .binary_search_by(|order| {
            match order_type {
                Order::Bid => order.price.cmp(&order_price).reverse(), // reverse for descending order for Bid
                Order::Ask => order.price.cmp(&order_price),           // ascending order for Ask
                _ => unreachable!(),
            }
        })
        .unwrap_or_else(|pos| pos);

    // Get the previous and next entries based on the position
    let prev = if position > 0 {
        Some(sorted_order_book[position - 1].pubkey_id)
    } else {
        None
    };
    let next = if position < sorted_order_book.len() {
        Some(sorted_order_book[position].pubkey_id)
    } else {
        None
    };

    (prev, next)
}
