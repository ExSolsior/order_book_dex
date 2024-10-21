use std::str::FromStr;

use actix_web::web;
use anchor_lang::{system_program::ID as system_program, InstructionData, ToAccountMetas};
use order_book_dex::state::Order;
use order_book_dex::{accounts, instruction, ID as program_id};
use solana_client::{
    client_error::ClientErrorKind, nonblocking::rpc_client::RpcClient, rpc_request::RpcError,
};
use solana_sdk::{
    commitment_config::CommitmentConfig, instruction::Instruction, pubkey::Pubkey,
    transaction::VersionedTransaction,
};
use spl_associated_token_account::get_associated_token_address_with_program_id;

use crate::db::models::get_trade_pair;
use crate::AppState;

use super::error::TransactionBuildError;
use super::pdas::{get_order_position_pda, get_vault_account_pda};
use super::util::{create_versioned_tx, find_prev_next_entries};
use super::{constants::RPC_ENDPOINT, pdas::get_order_position_config_pda};

#[derive(Debug, Clone)]
pub struct OpenLimitOrderParams {
    pub order_book_config: Pubkey,
    pub signer: Pubkey,
    pub next_position_pointer: Option<Pubkey>,
    pub order_type: Order,
    pub price: u64,
    pub amount: u64,
    pub nonce: u64,
}

pub async fn open_limit_order(
    app_state: web::Data<AppState>,
    params: OpenLimitOrderParams,
) -> Result<VersionedTransaction, TransactionBuildError> {
    let OpenLimitOrderParams {
        order_book_config,
        signer,
        next_position_pointer,
        order_type,
        price,
        amount,
        nonce,
    } = params;
    let mut ixs = vec![];
    let rpc_client =
        RpcClient::new_with_commitment(RPC_ENDPOINT.to_string(), CommitmentConfig::confirmed());
    let order_book_data = get_trade_pair(order_book_config.to_string(), app_state).await?;

    let order_position_config_pda = get_order_position_config_pda(signer, order_book_config);
    let order_position_config = rpc_client.get_account(&order_position_config_pda).await;
    let is_first_interaction = match order_position_config {
        Err(err) => match err.kind() {
            ClientErrorKind::RpcError(RpcError::ForUser(message))
                if message.contains("AccountNotFound") =>
            {
                true
            }
            _ => return Err(TransactionBuildError::RpcClient(err)),
        },
        Ok(_) => false,
    };

    let token_mint_a = Pubkey::from_str(&order_book_data.token_mint_a).unwrap();
    let token_mint_b = Pubkey::from_str(&order_book_data.token_mint_b).unwrap();
    let token_program_a = Pubkey::from_str(&order_book_data.token_program_a).unwrap();
    let token_program_b = Pubkey::from_str(&order_book_data.token_program_b).unwrap();
    let order_position_config = get_order_position_config_pda(signer, order_book_config);

    if is_first_interaction {
        ixs.push(Instruction {
            program_id,
            accounts: ToAccountMetas::to_account_metas(
                &accounts::CreateVaultAccounts {
                    signer,
                    order_book_config,
                    token_mint_a,
                    token_mint_b,
                    vault_a: get_vault_account_pda(order_book_config, token_mint_a, signer),
                    vault_b: get_vault_account_pda(order_book_config, token_mint_b, signer),
                    token_program_a,
                    token_program_b,
                    system_program,
                },
                None,
            ),
            data: InstructionData::data(&instruction::CreateVaultAccounts {}),
        });

        ixs.push(Instruction {
            program_id,
            accounts: ToAccountMetas::to_account_metas(
                &accounts::CreateOrderPositionConfig {
                    signer,
                    order_book_config,
                    order_position_config,
                    system_program,
                },
                None,
            ),
            data: InstructionData::data(&instruction::CreateOrderPositionConfig {}),
        });
    }

    let resolved_source: Pubkey;
    let resolved_dest: Pubkey;
    let capital_source: Pubkey;

    if (!order_book_data.is_reverse && order_type == Order::Bid)
        || (order_book_data.is_reverse && order_type == Order::Ask)
    {
        // Capital source derived with mint A
        capital_source =
            get_associated_token_address_with_program_id(&signer, &token_mint_a, &token_program_a);

        // Source derived with mint A, destination derived with mint B
        resolved_source = get_vault_account_pda(order_book_config, token_mint_a, signer);
        resolved_dest = get_vault_account_pda(order_book_config, token_mint_b, signer);
    } else {
        // Capital source derived with mint B
        capital_source =
            get_associated_token_address_with_program_id(&signer, &token_mint_b, &token_program_b);

        // Source derived with mint B, destination derived with mint A
        resolved_source = get_vault_account_pda(order_book_config, token_mint_b, signer);
        resolved_dest = get_vault_account_pda(order_book_config, token_mint_a, signer);
    }

    let order_position = get_order_position_pda(nonce, signer);

    ixs.push(Instruction {
        program_id,
        accounts: ToAccountMetas::to_account_metas(
            &accounts::CreateOrderPosition {
                signer,
                order_book_config,
                order_position_config,
                order_position,
                token_mint_a,
                token_mint_b,
                capital_source,
                source: resolved_source,
                destination: resolved_dest,
                token_program_a,
                token_program_b,
                system_program,
            },
            None,
        ),
        data: InstructionData::data(&instruction::CreateOrderPosition {
            order_type: order_type.clone(),
            price,
            amount,
        }),
    });

    let market_pointer = if order_type == Order::Bid {
        Pubkey::from_str(&order_book_data.buy_market_pointer_pubkey).unwrap()
    } else {
        Pubkey::from_str(&order_book_data.sell_market_pointer_pubkey).unwrap()
    };

    let (prev_order_position, next_order_position) =
        find_prev_next_entries(order_type, price, order_book_data.order_book);

    ixs.push(Instruction {
        program_id,
        accounts: ToAccountMetas::to_account_metas(
            &accounts::OpenOrderPosition {
                signer,
                order_book_config,
                market_pointer_read: Some(market_pointer),
                market_pointer_write: Some(market_pointer),
                order_position,
                order_position_config,
                prev_order_position,
                next_order_position,
                next_position_pointer,
            },
            None,
        ),
        data: InstructionData::data(&instruction::OpenOrderPosition {}),
    });

    let tx = create_versioned_tx(&rpc_client, &signer, &ixs).await?;
    Ok(tx)
}
