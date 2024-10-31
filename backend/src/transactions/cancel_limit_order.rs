use std::str::FromStr;

use actix_web::web;
use anchor_lang::{InstructionData, ToAccountMetas};
use order_book_dex::{accounts, instruction, state::Order, ID as program_id};
use solana_sdk::{
    // feature_set::instructions_sysvar_owned_by_sysvar,
    instruction::Instruction,
    pubkey::Pubkey,
    system_program::ID as system_program,
    transaction::VersionedTransaction,
};
use spl_associated_token_account::get_associated_token_address_with_program_id;

use crate::{db::models::get_trade_pair, AppState};

use super::{
    error::TransactionBuildError,
    pdas::get_vault_account_pda,
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
    let order_book_data =
        get_trade_pair(&order_book_config, &Option::<Pubkey>::None, app_state).await?;

    let cleaned_order_book_entries = match order_type {
        Order::Bid => {
            let mut list = vec![];
            if let Some(bids) = order_book_data["book"]["bids"].as_array() {
                for bid in bids {
                    list.push((
                        Pubkey::from_str(bid["pubkeyId"].as_str().unwrap()).unwrap(),
                        (!bid["nextPosition"].is_null()).then(|| {
                            Pubkey::from_str(bid["nextPosition"].as_str().unwrap()).unwrap()
                        }),
                        Pubkey::from_str(bid["marketMaker"].as_str().unwrap()).unwrap(),
                    ));
                }
            };
            list
        }

        Order::Ask => {
            let mut list = vec![];
            if let Some(asks) = order_book_data["book"]["asks"].as_array() {
                for ask in asks {
                    list.push((
                        Pubkey::from_str(ask["pubkeyId"].as_str().unwrap()).unwrap(),
                        (!ask["nextPosition"].is_null()).then(|| {
                            Pubkey::from_str(ask["nextPosition"].as_str().unwrap()).unwrap()
                        }),
                        Pubkey::from_str(ask["marketMaker"].as_str().unwrap()).unwrap(),
                    ));
                }
            };
            list
        }

        _ => unreachable!(),
    };

    let (index, order_position_data) = match cleaned_order_book_entries
        .iter()
        .enumerate()
        .find(|(_, op)| op.0 == order_position && op.2 == signer)
    {
        Some(data) => data,
        None => return Err(TransactionBuildError::InvalidOrderPositionOrSigner),
    };

    let prev_order_position =
        (!(index == 0)).then(|| cleaned_order_book_entries.get(index - 1).unwrap().0);
    let next_order_position = order_position_data.1;

    let buy_market_pointer =
        Pubkey::from_str(order_book_data["buyMarketPointer"].as_str().unwrap()).unwrap();
    let sell_market_pointer =
        Pubkey::from_str(order_book_data["sellMarketPointer"].as_str().unwrap()).unwrap();

    let (market_pointer, is_write) = match order_type {
        Order::Bid => (sell_market_pointer, index == 0),
        Order::Ask => (buy_market_pointer, index == 0),
        _ => unreachable!(), // Not handling buy and sell order types
    };

    let order_position_config = order_position_data.0;

    let ixs = build_ixs(BuildIxParams {
        signer,
        order_book_config,
        market_pointer_read: (!is_write).then_some(market_pointer),
        market_pointer_write: is_write.then_some(market_pointer),

        order_position,
        order_position_config,
        prev_order_position,
        next_order_position,
        is_reverse: order_book_data["isReverse"].as_bool().unwrap(),
        order_type,

        token_mint_a: Pubkey::from_str(order_book_data["tokenMintA"].as_str().unwrap()).unwrap(),
        token_mint_b: Pubkey::from_str(order_book_data["tokenMintB"].as_str().unwrap()).unwrap(),
        token_program_a: Pubkey::from_str(order_book_data["tokenProgramA"].as_str().unwrap())
            .unwrap(),
        token_program_b: Pubkey::from_str(order_book_data["tokenProgramB"].as_str().unwrap())
            .unwrap(),
    });

    let tx = create_versioned_tx(&rpc_client, &signer, &ixs).await?;
    Ok(tx)
}

// pub async fn cancel_limit_order(
//     app_state: web::Data<AppState>,
//     params: CancelLimitOrderParams,
// ) -> Result<VersionedTransaction, TransactionBuildError> {
//     let CancelLimitOrderParams {
//         order_book_config,
//         signer,
//         order_position,
//         order_type,
//     } = params;

//     let rpc_client = create_rpc_client();
//     let order_book_data = get_trade_pair(order_book_config.to_string(), app_state).await?;

//     // TODO: Fix double parsing once backend data is changed
//     let order_book_entries =
//         serde_json::from_str::<Vec<OrderPosition>>(&order_book_data.order_book).unwrap();

//     // Filtered and sorted order book entries
//     let mut cleaned_order_book_entries: Vec<_> = order_book_entries
//         .into_iter()
//         .filter(|op| {
//             op.order_type
//                 == if order_type == Order::Bid {
//                     "bid"
//                 } else {
//                     "ask"
//                 }
//         })
//         .collect();
//     if order_type == Order::Bid {
//         cleaned_order_book_entries.sort_by(|a, b| a.price.cmp(&b.price));
//     } else {
//         cleaned_order_book_entries.sort_by(|a, b| b.price.cmp(&a.price));
//     }

//     let (index, order_position_data) = cleaned_order_book_entries
//         .iter()
//         .enumerate()
//         .find(|(_, op)| op.pubkey_id == order_position.to_string())
//         .unwrap();

//     let prev_order_position_data = match order_type {
//         Order::Bid => {
//             if index == cleaned_order_book_entries.len() - 1 {
//                 None
//             } else {
//                 cleaned_order_book_entries.get(index + 1)
//             }
//         }
//         Order::Ask => {
//             if index == 0 {
//                 None
//             } else {
//                 cleaned_order_book_entries.get(index - 1)
//             }
//         }
//         _ => unreachable!(), // Not handling buy and sell order types
//     };
//     let prev_order_position =
//         prev_order_position_data.map(|op| Pubkey::from_str(&op.pubkey_id).unwrap());
//     let next_order_position = order_position_data
//         .next_order_position_pubkey
//         .as_ref()
//         .map(|pubkey_str| Pubkey::from_str(pubkey_str).unwrap());

//     let buy_market_pointer = Pubkey::from_str(&order_book_data.buy_market_pointer_pubkey).unwrap();
//     let sell_market_pointer =
//         Pubkey::from_str(&order_book_data.sell_market_pointer_pubkey).unwrap();
//     let (market_pointer, is_write) = match order_type {
//         Order::Bid => (
//             sell_market_pointer,
//             index == cleaned_order_book_entries.len() - 1,
//         ),
//         Order::Ask => (buy_market_pointer, index == 0),
//         _ => unreachable!(), // Not handling buy and sell order types
//     };
//     let order_position_config =
//         Pubkey::from_str(&order_position_data.order_position_config_pubkey).unwrap();

//     let ixs = build_ixs(BuildIxParams {
//         signer,
//         order_book_config,
//         market_pointer_read: if !is_write {
//             Some(market_pointer)
//         } else {
//             None
//         },
//         market_pointer_write: if is_write { Some(market_pointer) } else { None },
//         order_position,
//         order_position_config,
//         prev_order_position,
//         next_order_position,
//         is_reverse: order_book_data.is_reverse,
//         order_type,
//         token_mint_a: Pubkey::from_str(&order_book_data.token_mint_a).unwrap(),
//         token_mint_b: Pubkey::from_str(&order_book_data.token_mint_b).unwrap(),
//         token_program_a: Pubkey::from_str(&order_book_data.token_program_a).unwrap(),
//         token_program_b: Pubkey::from_str(&order_book_data.token_program_b).unwrap(),
//     });

//     let tx = create_versioned_tx(&rpc_client, &signer, &ixs).await?;
//     Ok(tx)
// }

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
    pub is_reverse: bool,
    pub order_type: Order,
    pub token_mint_a: Pubkey,
    pub token_mint_b: Pubkey,
    pub token_program_a: Pubkey,
    pub token_program_b: Pubkey,
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
        is_reverse,
        order_type,
        token_mint_a,
        token_mint_b,
        token_program_a,
        token_program_b,
    } = build_ix_params;

    let resolved_source: Pubkey;
    let resolved_dest: Pubkey;
    let capital_source: Pubkey;
    let capital_dest: Pubkey;
    let token_mint_source: Pubkey;
    let token_mint_dest: Pubkey;
    let source_program: Pubkey;
    let dest_program: Pubkey;

    if (!is_reverse && order_type == Order::Bid) || (is_reverse && order_type == Order::Ask) {
        // Capital source derived with mint A
        capital_source =
            get_associated_token_address_with_program_id(&signer, &token_mint_a, &token_program_a);
        capital_dest =
            get_associated_token_address_with_program_id(&signer, &token_mint_b, &token_program_b);

        // Source derived with mint A, destination derived with mint B
        resolved_source = get_vault_account_pda(order_book_config, token_mint_a, signer);
        resolved_dest = get_vault_account_pda(order_book_config, token_mint_b, signer);

        token_mint_source = token_mint_a;
        token_mint_dest = token_mint_b;
        source_program = token_program_a;
        dest_program = token_program_b;
    } else {
        // Capital source derived with mint B
        capital_source =
            get_associated_token_address_with_program_id(&signer, &token_mint_b, &token_program_b);
        capital_dest =
            get_associated_token_address_with_program_id(&signer, &token_mint_a, &token_program_a);

        // Source derived with mint B, destination derived with mint A
        resolved_source = get_vault_account_pda(order_book_config, token_mint_b, signer);
        resolved_dest = get_vault_account_pda(order_book_config, token_mint_a, signer);

        token_mint_source = token_mint_b;
        token_mint_dest = token_mint_a;
        source_program = token_program_b;
        dest_program = token_program_a;
    }

    let ixs = vec![
        Instruction {
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
        },
        Instruction {
            program_id,
            accounts: ToAccountMetas::to_account_metas(
                &accounts::CloseOrderPosition {
                    signer,
                    owner: signer,
                    order_book_config,
                    order_position,
                    order_position_config,
                    source: resolved_source,
                    dest: resolved_dest,
                    capital_source,
                    capital_dest,
                    token_mint_source,
                    token_mint_dest,
                    source_program,
                    dest_program,
                    system_program,
                },
                None,
            ),
            data: InstructionData::data(&instruction::CloseOrderPosition {}),
        },
    ];

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
        util::_get_market_pointer,
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

        let bid_market_pointer = _get_market_pointer(
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
        let ask_market_pointer = _get_market_pointer(
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
            market_pointer_read: if ask_market_pointer.1 {
                None
            } else {
                Some(ask_market_pointer.0)
            },
            market_pointer_write: ask_market_pointer.1.then_some(ask_market_pointer.0),
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
        let order_position_config =
            get_order_position_config_pda(signer.pubkey(), order_book_config);
        let cancel_limit_order_params = BuildIxParams {
            signer: signer.pubkey(),
            order_book_config,
            market_pointer_read: None,
            market_pointer_write: Some(bid_market_pointer.0),
            order_position: bid_order_position,
            order_position_config,
            prev_order_position: None,
            next_order_position: None,
            is_reverse: false,
            order_type: Order::Bid,
            token_mint_a,
            token_mint_b,
            token_program_a: mint_a.owner,
            token_program_b: mint_b.owner,
        };
        let ixs = build_ixs(cancel_limit_order_params);
        let tx = create_banks_client_verioned_tx(&mut banks_client, &signer, &ixs).await;
        banks_client.process_transaction(tx).await.unwrap();

        // Test cancel ask limit order

        let ask_order_position = get_order_position_pda(1, signer.pubkey());
        let cancel_limit_order_params = BuildIxParams {
            signer: signer.pubkey(),
            order_book_config,
            market_pointer_read: None,
            market_pointer_write: Some(ask_market_pointer.0),
            order_position: ask_order_position,
            order_position_config,
            prev_order_position: None,
            next_order_position: None,
            is_reverse: false,
            order_type: Order::Ask,
            token_mint_a,
            token_mint_b,
            token_program_a: mint_a.owner,
            token_program_b: mint_b.owner,
        };
        let ixs = build_ixs(cancel_limit_order_params);
        let tx = create_banks_client_verioned_tx(&mut banks_client, &signer, &ixs).await;
        banks_client.process_transaction(tx).await.unwrap();
    }
}

// 'pubkey_id', a.pubkey_id,
// 'position_config', a.position_config,
// 'next_position', a.next_position,
// 'market_maker', a.market_maker,
// 'order_type', a.order_type,
// 'price', a.price,
// 'size', a.size,
// 'is_available', a.is_available,
// 'source_capital', a.capital_source,
// 'destination_capital', a.capital_destination,
// 'source_vault', a.source,
// 'destination_vault', a.destination,
// 'slot', a.slot,
// 'timestamp', a.timestamp
