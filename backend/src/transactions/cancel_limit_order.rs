use std::str::FromStr;

use actix_web::web;
use anchor_lang::{InstructionData, ToAccountMetas};
use order_book_dex::{accounts, instruction, state::Order, ID as program_id};
use solana_sdk::{instruction::Instruction, pubkey::Pubkey, transaction::VersionedTransaction};

use crate::{
    db::models::{get_trade_pair, OrderPosition},
    AppState,
};

use super::{
    error::TransactionBuildError,
    util::{create_rpc_client, create_versioned_tx},
};

#[derive(Debug, Clone)]
pub struct CancelLimitOrderParams {
    pub order_book_config: Pubkey,
    pub signer: Pubkey,
    pub order_position: Pubkey,
    pub order_type: Order,
}

pub async fn cancel_limit_order(
    app_state: web::Data<AppState>,
    params: CancelLimitOrderParams,
) -> Result<VersionedTransaction, TransactionBuildError> {
    let CancelLimitOrderParams {
        order_book_config,
        signer,
        order_position,
        order_type,
    } = params;

    let rpc_client = create_rpc_client();
    let order_book_data = get_trade_pair(order_book_config.to_string(), app_state).await?;

    // TODO: Fix double parsing once backend data is changed
    let order_book_entries =
        serde_json::from_str::<Vec<OrderPosition>>(&order_book_data.order_book).unwrap();

    // Filtered and sorted order book entries
    let mut cleaned_order_book_entries: Vec<_> = order_book_entries
        .into_iter()
        .filter(|op| {
            op.order_type
                == if order_type == Order::Bid {
                    "bid"
                } else {
                    "ask"
                }
        })
        .collect();
    if order_type == Order::Bid {
        cleaned_order_book_entries.sort_by(|a, b| a.price.cmp(&b.price));
    } else {
        cleaned_order_book_entries.sort_by(|a, b| b.price.cmp(&a.price));
    }

    let (index, order_position_data) = cleaned_order_book_entries
        .iter()
        .enumerate()
        .find(|(_, op)| op.pubkey_id == order_position.to_string())
        .unwrap();

    let prev_order_position_data = match order_type {
        Order::Bid => {
            if index == cleaned_order_book_entries.len() - 1 {
                None
            } else {
                cleaned_order_book_entries.get(index + 1)
            }
        }
        Order::Ask => {
            if index == 0 {
                None
            } else {
                cleaned_order_book_entries.get(index - 1)
            }
        }
        _ => unreachable!(), // Not handling buy and sell order types
    };
    let prev_order_position =
        prev_order_position_data.map(|op| Pubkey::from_str(&op.pubkey_id).unwrap());
    let next_order_position = order_position_data
        .next_order_position_pubkey
        .as_ref()
        .map(|pubkey_str| Pubkey::from_str(pubkey_str).unwrap());

    let buy_market_pointer = Pubkey::from_str(&order_book_data.buy_market_pointer_pubkey).unwrap();
    let sell_market_pointer =
        Pubkey::from_str(&order_book_data.sell_market_pointer_pubkey).unwrap();
    let (market_pointer, is_write) = match order_type {
        Order::Bid => (
            sell_market_pointer,
            index == cleaned_order_book_entries.len() - 1,
        ),
        Order::Ask => (buy_market_pointer, index == 0),
        _ => unreachable!(), // Not handling buy and sell order types
    };
    let order_position_config =
        Pubkey::from_str(&order_position_data.order_position_config_pubkey).unwrap();

    let ixs = build_ixs(BuildIxParams {
        signer,
        order_book_config,
        market_pointer_read: if !is_write {
            Some(market_pointer)
        } else {
            None
        },
        market_pointer_write: if is_write { Some(market_pointer) } else { None },
        order_position,
        order_position_config,
        prev_order_position,
        next_order_position,
    });

    let tx = create_versioned_tx(&rpc_client, &signer, &ixs).await?;
    Ok(tx)
}

#[derive(Debug, Clone)]
pub struct BuildIxParams {
    pub signer: Pubkey,
    pub order_book_config: Pubkey,
    pub market_pointer_read: Option<Pubkey>,
    pub market_pointer_write: Option<Pubkey>,
    pub order_position: Pubkey,
    pub order_position_config: Pubkey,
    pub prev_order_position: Option<Pubkey>,
    pub next_order_position: Option<Pubkey>,
}

pub fn build_ixs(build_ix_params: BuildIxParams) -> Vec<Instruction> {
    let BuildIxParams {
        signer,
        order_book_config,
        market_pointer_read,
        market_pointer_write,
        order_position,
        order_position_config,
        prev_order_position,
        next_order_position,
    } = build_ix_params;

    let ixs = vec![Instruction {
        program_id,
        accounts: ToAccountMetas::to_account_metas(
            &accounts::CancelOrderPosition {
                signer,
                order_book_config,
                market_pointer_read,
                market_pointer_write,
                order_position,
                order_position_config,
                prev_order_position,
                next_order_position,
            },
            None,
        ),
        data: InstructionData::data(&instruction::CancelOrderPosition {}),
    }];

    ixs
}

#[cfg(test)]
mod tests {
    use solana_sdk::signer::Signer;

    use crate::transactions::{
        create_trade_pair::{self, CreateTradePairParams},
        open_limit_order,
        pdas::{
            get_buy_market_pointer_pda, get_order_book_config_pda, get_order_position_config_pda,
            get_order_position_pda, get_sell_market_pointer_pda,
        },
        test_util::*,
        util::get_market_pointer,
    };

    use super::*;

    #[tokio::test]
    async fn test_close_limit_order_tx() {
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

        let bid_market_pointer = get_market_pointer(
            buy_market_pointer,
            sell_market_pointer,
            Order::Bid,
            1,
            None,
            None,
        );
        let open_limit_order_build_params = open_limit_order::BuildIxsParams {
            signer: signer.pubkey(),
            order_book_config,
            token_mint_a,
            token_mint_b,
            token_program_a: mint_a.owner,
            token_program_b: mint_b.owner,
            market_pointer_read: if bid_market_pointer.1 {
                None
            } else {
                Some(bid_market_pointer.0)
            },
            market_pointer_write: bid_market_pointer.1.then_some(bid_market_pointer.0),
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
        let ixs = open_limit_order::build_ixs(open_limit_order_build_params);
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
        let open_limit_order_build_params = open_limit_order::BuildIxsParams {
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
        let ixs = open_limit_order::build_ixs(open_limit_order_build_params);
        let tx = create_banks_client_verioned_tx(&mut banks_client, &signer, &ixs).await;
        banks_client.process_transaction(tx).await.unwrap();

        // Test cancel bid limit order
        let bid_order_position = get_order_position_pda(0, signer.pubkey());
        let bid_order_position_config =
            get_order_position_config_pda(signer.pubkey(), order_book_config);
        let cancel_limit_order_params = BuildIxParams {
            signer: signer.pubkey(),
            order_book_config,
            market_pointer_read: None,
            market_pointer_write: Some(bid_market_pointer.0),
            order_position: bid_order_position,
            order_position_config: bid_order_position_config,
            prev_order_position: None,
            next_order_position: None,
        };
        let ixs = build_ixs(cancel_limit_order_params);
        let tx = create_banks_client_verioned_tx(&mut banks_client, &signer, &ixs).await;
        banks_client.process_transaction(tx).await.unwrap();
    }
}
