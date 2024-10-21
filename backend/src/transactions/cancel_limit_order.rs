use std::str::FromStr;

use actix_web::web;
use anchor_lang::{system_program::ID as system_program, InstructionData, ToAccountMetas};
use order_book_dex::{accounts, instruction, ID as program_id};
use solana_client::nonblocking::rpc_client::RpcClient;
use solana_sdk::{
    commitment_config::CommitmentConfig, instruction::Instruction, pubkey::Pubkey,
    transaction::VersionedTransaction,
};

use crate::{
    db::models::{get_trade_pair, OrderPosition},
    AppState,
};

use super::pdas::get_order_position_config_pda;
use super::{constants::RPC_ENDPOINT, error::TransactionBuildError, util::create_versioned_tx};

#[derive(Debug, Clone)]
pub struct CancelLimitOrderParams {
    pub order_book_config: Pubkey,
    pub signer: Pubkey,
    pub order_position: Pubkey,
}

pub async fn cancel_limit_order(
    app_state: web::Data<AppState>,
    params: CancelLimitOrderParams,
) -> Result<VersionedTransaction, TransactionBuildError> {
    let CancelLimitOrderParams {
        order_book_config,
        signer,
        order_position,
    } = params;

    let mut ixs = vec![];
    let rpc_client =
        RpcClient::new_with_commitment(RPC_ENDPOINT.to_string(), CommitmentConfig::confirmed());

    let order_book_data = get_trade_pair(order_book_config.to_string(), app_state).await?;
    // TODO: Fix double parsing once backend data is changed
    let order_book_entries =
        serde_json::from_str::<Vec<OrderPosition>>(&order_book_data.order_book).unwrap();
    let order_position_data = order_book_entries
        .iter()
        .find(|op| op.pubkey_id == order_position.to_string())
        .unwrap();

    let order_position_config = get_order_position_config_pda(signer, order_book_config);
    let market_pointer = if order_position_data.order_type == "bid" {
        Pubkey::from_str(&order_book_data.buy_market_pointer_pubkey).unwrap()
    } else {
        Pubkey::from_str(&order_book_data.sell_market_pointer_pubkey).unwrap()
    };

    let prev_order_position = order_book_entries
        .iter()
        .find(|op| op.next_order_position_pubkey == Some(order_position.to_string()))
        .map(|op| Pubkey::from_str(&op.pubkey_id).unwrap());
    let next_order_position = order_position_data
        .next_order_position_pubkey
        .as_ref()
        .map(|pubkey_str| Pubkey::from_str(&pubkey_str).unwrap());

    // TODO: Complete instructions after solana program is fixed

    let tx = create_versioned_tx(&rpc_client, &signer, ixs).await?;
    Ok(tx)
}
