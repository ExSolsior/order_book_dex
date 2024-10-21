use std::str::FromStr;

use order_book_dex::state::Order;
use solana_client::nonblocking::rpc_client::RpcClient;
use solana_sdk::{
    instruction::Instruction,
    message::{v0::Message, VersionedMessage},
    pubkey::Pubkey,
    transaction::VersionedTransaction,
};

use crate::db::models::OrderPosition;

use super::error::TransactionBuildError;

pub async fn create_versioned_tx(
    rpc_client: &RpcClient,
    payer: &Pubkey,
    ixs: Vec<Instruction>,
) -> Result<VersionedTransaction, TransactionBuildError> {
    let recent_blockhash = rpc_client.get_latest_blockhash().await?;
    Ok(VersionedTransaction {
        signatures: vec![],
        message: VersionedMessage::V0(Message::try_compile(payer, &ixs, &[], recent_blockhash)?),
    })
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
        Some(Pubkey::from_str(&sorted_order_book[position - 1].pubkey_id).unwrap())
    } else {
        None
    };
    let next = if position < sorted_order_book.len() {
        Some(Pubkey::from_str(&sorted_order_book[position].pubkey_id).unwrap())
    } else {
        None
    };

    (prev, next)
}
