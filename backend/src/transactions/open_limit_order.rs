use std::str::FromStr;

use actix_web::web;
use anchor_lang::{system_program::ID as system_program, InstructionData, ToAccountMetas};
use order_book_dex::state::Order;
use order_book_dex::{accounts, instruction, ID as program_id};
use solana_client::{client_error::ClientErrorKind, rpc_request::RpcError};
use solana_sdk::{instruction::Instruction, pubkey::Pubkey, transaction::VersionedTransaction};
use spl_associated_token_account::get_associated_token_address_with_program_id;

use crate::db::models::{get_trade_pair, OrderPosition};
use crate::AppState;

use super::error::TransactionBuildError;
use super::pdas::get_order_position_config_pda;
use super::pdas::{get_order_position_pda, get_vault_account_pda};
use super::util::{
    create_rpc_client, create_versioned_tx, find_prev_next_entries, get_market_pointer,
};

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
    let rpc_client = create_rpc_client();
    let order_book_data = get_trade_pair(params.order_book_config.to_string(), app_state).await?;

    let order_position_config_pda =
        get_order_position_config_pda(params.signer, params.order_book_config);
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

    // TODO: Fix double parsing once backend data is changed
    let order_book_entries =
        serde_json::from_str::<Vec<OrderPosition>>(&order_book_data.order_book).unwrap();

    let max_bid_price = order_book_entries
        .iter()
        .filter(|order| order.order_type == "bid")
        .map(|order| order.price)
        .max();
    let min_ask_price = order_book_entries
        .iter()
        .filter(|order| order.order_type == "ask")
        .map(|order| order.price)
        .min();
    let market_pointer = get_market_pointer(
        Pubkey::from_str(&order_book_data.buy_market_pointer_pubkey).unwrap(),
        Pubkey::from_str(&order_book_data.sell_market_pointer_pubkey).unwrap(),
        params.order_type.clone(),
        params.price,
        min_ask_price,
        max_bid_price,
    );

    let (prev_order_position, next_order_position) = find_prev_next_entries(
        params.order_type.clone(),
        params.price,
        order_book_data.order_book,
    );

    let signer = params.signer;

    let ixs = build_ixs(BuildIxsParams {
        signer,
        order_book_config: params.order_book_config,
        token_mint_a: Pubkey::from_str(&order_book_data.token_mint_a).unwrap(),
        token_mint_b: Pubkey::from_str(&order_book_data.token_mint_b).unwrap(),
        token_program_a: Pubkey::from_str(&order_book_data.token_program_a).unwrap(),
        token_program_b: Pubkey::from_str(&order_book_data.token_program_b).unwrap(),
        market_pointer_read: if market_pointer.1 {
            None
        } else {
            Some(market_pointer.0)
        },
        market_pointer_write: market_pointer.1.then_some(market_pointer.0),
        prev_order_position,
        next_order_position,
        next_position_pointer: params.next_position_pointer,
        is_first_interaction,
        is_reverse: order_book_data.is_reverse,
        order_type: params.order_type,
        price: params.price,
        amount: params.amount,
        nonce: params.nonce,
    });

    let tx = create_versioned_tx(&rpc_client, &signer, &ixs).await?;
    Ok(tx)
}

#[derive(Debug, Clone)]
pub struct BuildIxsParams {
    signer: Pubkey,
    order_book_config: Pubkey,
    token_mint_a: Pubkey,
    token_mint_b: Pubkey,
    token_program_a: Pubkey,
    token_program_b: Pubkey,
    market_pointer_read: Option<Pubkey>,
    market_pointer_write: Option<Pubkey>,
    prev_order_position: Option<Pubkey>,
    next_order_position: Option<Pubkey>,
    next_position_pointer: Option<Pubkey>,
    is_first_interaction: bool,
    is_reverse: bool,
    order_type: Order,
    price: u64,
    amount: u64,
    nonce: u64,
}

// Separate function for testing
pub fn build_ixs(build_ix_params: BuildIxsParams) -> Vec<Instruction> {
    let BuildIxsParams {
        signer,
        order_book_config,
        token_mint_a,
        token_mint_b,
        token_program_a,
        token_program_b,
        market_pointer_read,
        market_pointer_write,
        prev_order_position,
        next_order_position,
        next_position_pointer,
        is_first_interaction,
        is_reverse,
        order_type,
        price,
        amount,
        nonce,
    } = build_ix_params;

    let order_position_config = get_order_position_config_pda(signer, order_book_config);

    let mut ixs = vec![];

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

        let capital_a =
            get_associated_token_address_with_program_id(&signer, &token_mint_a, &token_program_a);
        let capital_b =
            get_associated_token_address_with_program_id(&signer, &token_mint_b, &token_program_b);

        ixs.push(Instruction {
            program_id,
            accounts: ToAccountMetas::to_account_metas(
                &accounts::CreateOrderPositionConfig {
                    signer,
                    order_book_config,
                    order_position_config,
                    capital_a,
                    capital_b,
                    token_mint_a,
                    token_mint_b,
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

    if (!is_reverse && order_type == Order::Bid) || (is_reverse && order_type == Order::Ask) {
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

    ixs.push(Instruction {
        program_id,
        accounts: ToAccountMetas::to_account_metas(
            &accounts::OpenOrderPosition {
                signer,
                order_book_config,
                market_pointer_read,
                market_pointer_write,
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

    ixs
}

#[cfg(test)]
mod tests {
    use solana_sdk::signer::Signer;

    use crate::transactions::{
        create_trade_pair,
        create_trade_pair::CreateTradePairParams,
        pdas::{
            get_buy_market_pointer_pda, get_order_book_config_pda, get_sell_market_pointer_pda,
        },
        test_util::*,
    };

    use super::*;

    #[tokio::test]
    async fn test_open_limit_order_tx() {
        let (program_test, signer) = setup();
        let (mut banks_client, _, _) = program_test.start().await;

        // Create trade pair
        let token_mint_a = Pubkey::from_str(JUP_MINT).unwrap();
        let token_mint_b = Pubkey::from_str(USDC_MINT).unwrap();

        let create_trade_pair_params = CreateTradePairParams {
            signer: signer.pubkey(),
            token_mint_a,
            token_mint_b,
            token_symbol_a: "JUP".to_string(),
            token_symbol_b: "USDC".to_string(),
            is_reverse: false,
        };

        let mint_a = banks_client
            .get_account(create_trade_pair_params.token_mint_a)
            .await
            .unwrap()
            .unwrap();
        let mint_b = banks_client
            .get_account(create_trade_pair_params.token_mint_b)
            .await
            .unwrap()
            .unwrap();

        let ixs = create_trade_pair::build_ixs(create_trade_pair_params, &mint_a, &mint_b);
        let tx = create_banks_client_verioned_tx(&mut banks_client, &signer, &ixs).await;
        banks_client.process_transaction(tx).await.unwrap();

        let order_book_config = get_order_book_config_pda(token_mint_a, token_mint_b);
        let buy_market_pointer = get_buy_market_pointer_pda(order_book_config);
        let sell_market_pointer = get_sell_market_pointer_pda(order_book_config);

        // Test bid limit order

        let market_pointer = get_market_pointer(
            buy_market_pointer,
            sell_market_pointer,
            Order::Bid,
            1,
            None,
            None,
        );
        let open_limit_order_build_params = BuildIxsParams {
            signer: signer.pubkey(),
            order_book_config,
            token_mint_a,
            token_mint_b,
            token_program_a: mint_a.owner,
            token_program_b: mint_b.owner,
            market_pointer_read: if market_pointer.1 {
                None
            } else {
                Some(market_pointer.0)
            },
            market_pointer_write: market_pointer.1.then_some(market_pointer.0),
            prev_order_position: None,
            next_order_position: None,
            next_position_pointer: None,
            is_first_interaction: true,
            is_reverse: false,
            order_type: Order::Bid,
            price: 1,
            amount: 100,
            nonce: 0,
        };
        let ixs = build_ixs(open_limit_order_build_params);
        let tx = create_banks_client_verioned_tx(&mut banks_client, &signer, &ixs).await;
        banks_client.process_transaction(tx).await.unwrap();

        // Test ask limit order

        let ask_price = 2;
        let market_pointer = get_market_pointer(
            buy_market_pointer,
            sell_market_pointer,
            Order::Ask,
            ask_price,
            None,
            Some(1), // Max bid price
        );
        let open_limit_order_build_params = BuildIxsParams {
            signer: signer.pubkey(),
            order_book_config,
            token_mint_a,
            token_mint_b,
            token_program_a: mint_a.owner,
            token_program_b: mint_b.owner,
            market_pointer_read: if market_pointer.1 {
                None
            } else {
                Some(market_pointer.0)
            },
            market_pointer_write: market_pointer.1.then_some(market_pointer.0),
            prev_order_position: None,
            next_order_position: None,
            next_position_pointer: None,
            is_first_interaction: false,
            is_reverse: false,
            order_type: Order::Ask,
            price: ask_price,
            amount: 100,
            nonce: 1,
        };
        let ixs = build_ixs(open_limit_order_build_params);
        let tx = create_banks_client_verioned_tx(&mut banks_client, &signer, &ixs).await;
        banks_client.process_transaction(tx).await.unwrap();
    }
}
