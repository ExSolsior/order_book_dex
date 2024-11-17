use std::str::FromStr;

use crate::{db::models::get_trade_pair, AppState};
use actix_web::web;
use anchor_lang::{InstructionData, ToAccountMetas};
use order_book_dex::{accounts, instruction, state::Fill, state::Order, ID as program_id};
use solana_sdk::{
    // feature_set::instructions_sysvar_owned_by_sysvar,
    instruction::Instruction,
    message::{v0::Message, VersionedMessage},
    pubkey::Pubkey,
    signature::NullSigner,
    system_program::ID as system_program,
    transaction::VersionedTransaction,
};
use spl_associated_token_account::get_associated_token_address_with_program_id;

use super::{error::TransactionBuildError, pdas::get_vault_account_pda, util::create_rpc_client};

pub struct MarketOrderParams {
    pub signer: Pubkey,
    pub position_config: Pubkey,
    pub order_book_config: Pubkey,
    pub order_type: Order,
    pub fill: Fill,
    pub target_amount: u64,
}

// need to correctly compute if need to create position config and vaults
pub async fn execute_market_order(
    app_state: web::Data<AppState>,
    market_order: MarketOrderParams,
) -> Result<Vec<VersionedTransaction>, TransactionBuildError> {
    let rpc_client = create_rpc_client();
    let order_book_data = get_trade_pair(
        &market_order.order_book_config,
        &Some(market_order.position_config),
        app_state,
    )
    .await?;

    println!(":: positionConfig {:?}", order_book_data["positionConfig"]);

    let market_pointer = match market_order.order_type {
        Order::Sell => {
            Pubkey::from_str(order_book_data["sellMarketPointer"].as_str().unwrap()).unwrap()
        }
        Order::Buy => {
            Pubkey::from_str(order_book_data["buyMarketPointer"].as_str().unwrap()).unwrap()
        }
        __ => unreachable!(),
    };

    let is_reverse = order_book_data["isReverse"].as_bool().unwrap();
    let token_mint_a = Pubkey::from_str(order_book_data["tokenMintA"].as_str().unwrap()).unwrap();
    let token_mint_b = Pubkey::from_str(order_book_data["tokenMintB"].as_str().unwrap()).unwrap();

    let token_program_a =
        Pubkey::from_str(order_book_data["tokenProgramA"].as_str().unwrap()).unwrap();
    let token_program_b =
        Pubkey::from_str(order_book_data["tokenProgramB"].as_str().unwrap()).unwrap();

    if market_order.order_type == Order::Sell && order_book_data["book"]["bids"].is_null()
        || market_order.order_type == Order::Buy && order_book_data["book"]["asks"].is_null()
    {
        return Err(TransactionBuildError::EmptyOrderBook);
    }

    let (
        source_vault,
        dest_vault,
        source_capital,
        dest_capital,
        source_mint,
        destination_mint,
        source_program,
        destination_program,
    ) = if (!is_reverse && market_order.order_type == Order::Sell)
        || (is_reverse && market_order.order_type == Order::Buy)
    {
        let source_vault = get_vault_account_pda(
            market_order.order_book_config,
            token_mint_b,
            market_order.signer,
        );
        let dest_vault = get_vault_account_pda(
            market_order.order_book_config,
            token_mint_a,
            market_order.signer,
        );

        let source_capital = get_associated_token_address_with_program_id(
            &market_order.signer,
            &token_mint_b,
            &token_program_b,
        );
        let dest_capital = get_associated_token_address_with_program_id(
            &market_order.signer,
            &token_mint_a,
            &token_program_a,
        );

        println!("");
        println!("source_vault: {}", source_vault);
        println!("dest_vault: {}", dest_vault);
        println!("source_capital: {}", source_capital);
        println!("dest_capital: {}", dest_capital);
        println!("token_mint_b: {}", token_mint_b);
        println!("token_mint_a: {}", token_mint_a);
        println!("token_program_b: {}", token_program_b);
        println!("token_program_a: {}", token_program_a);

        (
            source_vault,
            dest_vault,
            source_capital,
            dest_capital,
            token_mint_b,
            token_mint_a,
            token_program_b,
            token_program_a,
        )
    } else {
        let source_vault = get_vault_account_pda(
            market_order.order_book_config,
            token_mint_a,
            market_order.signer,
        );
        let dest_vault = get_vault_account_pda(
            market_order.order_book_config,
            token_mint_b,
            market_order.signer,
        );

        let source_capital = get_associated_token_address_with_program_id(
            &market_order.signer,
            &token_mint_a,
            &token_program_a,
        );
        let dest_capital = get_associated_token_address_with_program_id(
            &market_order.signer,
            &token_mint_b,
            &token_program_b,
        );

        println!("");
        println!("source_vault: {}", source_vault);
        println!("dest_vault: {}", dest_vault);
        println!("source_capital: {}", source_capital);
        println!("dest_capital: {}", dest_capital);
        println!("token_mint_a: {}", token_mint_a);
        println!("token_mint_b: {}", token_mint_b);
        println!("token_program_a: {}", token_program_a);
        println!("token_program_b: {}", token_program_b);

        (
            source_vault,
            dest_vault,
            source_capital,
            dest_capital,
            token_mint_a,
            token_mint_b,
            token_program_a,
            token_program_b,
        )
    };

    // need to facter in the fill -> amount = size - fill
    let positions = match market_order.order_type {
        Order::Sell => {
            let mut list = vec![];
            let mut target_amount = market_order.target_amount;
            let mut next: Option<Pubkey> = Some(
                Pubkey::from_str(
                    order_book_data["book"]["bids"][0]["pubkeyId"]
                        .as_str()
                        .unwrap(),
                )
                .unwrap(),
            );
            println!("prep next position {:?}", next);
            if let Some(bids) = order_book_data["book"]["bids"].as_array() {
                for bid in bids {
                    // price and size are coming as string
                    // so need to parse as u64
                    let price: u64 = bid["price"]
                        .as_str()
                        .unwrap()
                        .parse()
                        .expect("expected to be u64");

                    let amount: u64 = bid["size"]
                        .as_str()
                        .unwrap()
                        .parse()
                        .expect("expected to be u64");

                    let pubkey_id = Pubkey::from_str(bid["pubkeyId"].as_str().unwrap()).unwrap();
                    if next.is_some() && next.unwrap() != pubkey_id {
                        // return error?
                        // or could be that it's the same price at the same slot
                        // and is out of order... so just sort into right order
                        // based on next_position?
                        // but how? need index... slice of remaining order position
                        break;
                    };

                    if target_amount == 0 {
                        break;
                    };

                    target_amount = if amount <= target_amount {
                        target_amount - amount
                    } else {
                        0
                    };

                    let (source_mint, source_program) = if !is_reverse {
                        (token_mint_a, token_program_a)
                    } else {
                        (token_mint_b, token_program_b)
                    };

                    let (destination_mint, destination_program) = if !is_reverse {
                        (token_mint_b, token_program_b)
                    } else {
                        (token_mint_a, token_program_a)
                    };

                    let market_maker =
                        Pubkey::from_str(bid["marketMaker"].as_str().unwrap()).unwrap();
                    let next_position = (!bid["nextPosition"].is_null())
                        .then(|| Pubkey::from_str(bid["nextPosition"].as_str().unwrap()).unwrap());
                    let source_vault =
                        Pubkey::from_str(bid["sourceVault"].as_str().unwrap()).unwrap();
                    let destination_vault =
                        Pubkey::from_str(bid["destinationVault"].as_str().unwrap()).unwrap();
                    let source_capital =
                        Pubkey::from_str(bid["sourceCapital"].as_str().unwrap()).unwrap();
                    let destination_capital =
                        Pubkey::from_str(bid["destinationCapital"].as_str().unwrap()).unwrap();
                    let postion_config =
                        Pubkey::from_str(bid["positionConfig"].as_str().unwrap()).unwrap();

                    println!("");
                    println!("pubkey_id: {}", pubkey_id);
                    println!("postion_config: {}", postion_config);
                    println!("next_position: {}", next_position.is_some());
                    println!("next_position: {:?}", next_position);
                    println!(
                        "NEXT POSITION POINTER: {:?}",
                        (target_amount == 0 && next_position.is_some())
                            .then(|| next_position.unwrap())
                    );

                    println!("market_maker: {}", market_maker);
                    println!("source_vault: {}", source_vault);
                    println!("destination_vault: {}", destination_vault);
                    println!("source_capital: {}", source_capital);
                    println!("destination_capital: {}", destination_capital);

                    println!("source_mint: {}", source_mint);
                    println!("destination_mint: {}", destination_mint);
                    println!("source_program: {}", source_program);
                    println!("destination_program: {}", destination_program);

                    println!("price: {}", price);
                    println!("amount: {}", amount);
                    println!("target_amount: {}", target_amount);

                    next = next_position.clone();
                    list.push((
                        pubkey_id,
                        postion_config,
                        next_position,
                        market_maker,
                        source_vault,
                        destination_vault,
                        source_capital,
                        destination_capital,
                        source_mint,
                        destination_mint,
                        source_program,
                        destination_program,
                        price,
                        amount,
                        target_amount,
                    ));
                }
            };
            list
        }

        Order::Buy => {
            let mut list = vec![];
            let mut target_amount = market_order.target_amount;
            let mut next: Option<Pubkey> = Some(
                Pubkey::from_str(
                    order_book_data["book"]["asks"][0]["pubkeyId"]
                        .as_str()
                        .unwrap(),
                )
                .unwrap(),
            );
            println!("prep next position {:?}", next);
            if let Some(asks) = order_book_data["book"]["asks"].as_array() {
                for ask in asks {
                    let price: u64 = ask["price"]
                        .as_str()
                        .unwrap()
                        .parse()
                        .expect("expected to be u64");
                    let amount: u64 = ask["size"]
                        .as_str()
                        .unwrap()
                        .parse()
                        .expect("expected to be u64");

                    let pubkey_id = Pubkey::from_str(ask["pubkeyId"].as_str().unwrap()).unwrap();
                    if next.is_some() && next.unwrap() != pubkey_id {
                        // return error?
                        // or could be that it's the same price at the same slot
                        // and is out of order... so just sort into right order
                        // based on next_position?
                        // but how? need index... slice of remaining order position
                        break;
                    };

                    if target_amount == 0 {
                        break;
                    };

                    target_amount = if amount <= target_amount {
                        target_amount - amount
                    } else {
                        0
                    };

                    let (source_mint, source_program) = if !is_reverse {
                        (token_mint_b, token_program_b)
                    } else {
                        (token_mint_a, token_program_a)
                    };

                    let (destination_mint, destination_program) = if !is_reverse {
                        (token_mint_a, token_program_a)
                    } else {
                        (token_mint_b, token_program_b)
                    };

                    let market_maker =
                        Pubkey::from_str(ask["marketMaker"].as_str().unwrap()).unwrap();
                    let next_position = (!ask["nextPosition"].is_null())
                        .then(|| Pubkey::from_str(ask["nextPosition"].as_str().unwrap()).unwrap());
                    let source_vault =
                        Pubkey::from_str(ask["sourceVault"].as_str().unwrap()).unwrap();
                    let destination_vault =
                        Pubkey::from_str(ask["destinationVault"].as_str().unwrap()).unwrap();
                    let source_capital =
                        Pubkey::from_str(ask["sourceCapital"].as_str().unwrap()).unwrap();
                    let destination_capital =
                        Pubkey::from_str(ask["destinationCapital"].as_str().unwrap()).unwrap();
                    let postion_config =
                        Pubkey::from_str(ask["positionConfig"].as_str().unwrap()).unwrap();

                    next = next_position.clone();
                    list.push((
                        pubkey_id,           // 0
                        postion_config,      // 1
                        next_position,       // 2
                        market_maker,        // 3
                        source_vault,        // 4
                        destination_vault,   // 5
                        source_capital,      // 6
                        destination_capital, // 7
                        source_mint,         // 8
                        destination_mint,    // 9
                        source_program,      // 10
                        destination_program, // 11
                        price,               // 12
                        amount,              // 13
                        target_amount,       // 14
                    ));
                }
            };
            list
        }

        _ => unreachable!(),
    };

    println!("THIS??? :: {:?}", positions[0].2);

    let mut list: Vec<VersionedTransaction> = Vec::new();
    let recent_blockhash = rpc_client.get_latest_blockhash().await?;
    let payer = market_order.signer;

    if positions.len() == 1 {
        let mut ixs = vec![];
        let target_amount = positions[0].14;
        let order_position = positions[0].0;
        let position_config = positions[0].1;

        let next_position_pointer = positions[0].2;
        let maker_source = positions[0].4;
        let maker_destination = positions[0].5;
        let capital_source = positions[0].6;
        let capital_destination = positions[0].7;

        println!("is null? {}", order_book_data["positionConfig"].is_null());

        if order_book_data["positionConfig"].is_null() {
            let capital_a = get_associated_token_address_with_program_id(
                &market_order.signer,
                &token_mint_a,
                &token_program_a,
            );
            let capital_b = get_associated_token_address_with_program_id(
                &market_order.signer,
                &token_mint_b,
                &token_program_b,
            );

            ixs.push(Instruction {
                program_id,
                accounts: ToAccountMetas::to_account_metas(
                    &accounts::CreateVaultAccounts {
                        signer: market_order.signer,
                        order_book_config: market_order.order_book_config,
                        token_mint_a,
                        token_mint_b,
                        vault_a: get_vault_account_pda(
                            market_order.order_book_config,
                            token_mint_a,
                            market_order.signer,
                        ),
                        vault_b: get_vault_account_pda(
                            market_order.order_book_config,
                            token_mint_b,
                            market_order.signer,
                        ),
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
                        signer: market_order.signer,
                        order_book_config: market_order.order_book_config,
                        order_position_config: market_order.position_config,
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
        println!(
            "NEXT POSITION POINTER: {:?}",
            (target_amount == 0 && next_position_pointer.is_some())
                .then(|| next_position_pointer.unwrap())
        );

        println!("TARGET AMOUNT: {:?}", target_amount);
        println!("ORDER POSITION: {:?}", order_position);

        ixs.push(create_market_order(
            market_order.signer,
            market_order.order_book_config,
            market_pointer,
            order_position,
            source_vault,
            dest_vault,
            source_capital,
            dest_capital,
            source_mint,
            destination_mint,
            source_program,
            (target_amount == 0 && next_position_pointer.is_some())
                .then(|| next_position_pointer.unwrap()),
            market_order.order_type,
            market_order.fill,
            market_order.target_amount,
        ));

        ixs.push(fill_market_order(
            market_order.signer,
            market_order.order_book_config,
            market_pointer,
            order_position,
            source_vault,
            maker_destination,
            maker_source,
            dest_vault,
            token_mint_a,
            token_mint_b,
            token_program_a,
            token_program_b,
        ));

        (target_amount == 0).then(|| {
            ixs.push(close_order_position(
                market_order.signer,
                positions[0].3,
                market_order.order_book_config,
                order_position,
                position_config,
                maker_source,
                maker_destination,
                capital_source,
                capital_destination,
                positions[0].8,
                positions[0].9,
                source_program,
                destination_program,
            ))
        });

        println!("SOURCE MINT: {:?}", source_mint);
        println!("SOURCE MINT: {:?}", positions[0].8);

        ixs.push(return_execution_market_order(
            market_order.signer,
            market_order.order_book_config,
            market_pointer,
            source_vault,
            dest_vault,
            source_capital,
            dest_capital,
            source_mint,
            destination_mint,
            source_program,
            destination_program,
        ));

        list.push(
            VersionedTransaction::try_new(
                VersionedMessage::V0(Message::try_compile(&payer, &ixs, &[], recent_blockhash)?),
                &[&NullSigner::new(&payer)],
            )
            .unwrap(),
        );
    } else {
        let target_amount = positions[positions.len() - 1].14;
        let order_position = positions[0].0;
        let next_position_pointer = positions[positions.len() - 1].2;

        let mut ixs = vec![];

        if !order_book_data["positionConfig"].is_null() {
            let capital_a = get_associated_token_address_with_program_id(
                &market_order.signer,
                &token_mint_a,
                &token_program_a,
            );

            let capital_b = get_associated_token_address_with_program_id(
                &market_order.signer,
                &token_mint_b,
                &token_program_b,
            );

            ixs.push(Instruction {
                program_id,
                accounts: ToAccountMetas::to_account_metas(
                    &accounts::CreateVaultAccounts {
                        signer: market_order.signer,
                        order_book_config: market_order.order_book_config,
                        token_mint_a,
                        token_mint_b,
                        vault_a: get_vault_account_pda(
                            market_order.order_book_config,
                            token_mint_a,
                            market_order.signer,
                        ),
                        vault_b: get_vault_account_pda(
                            market_order.order_book_config,
                            token_mint_b,
                            market_order.signer,
                        ),
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
                        signer: market_order.signer,
                        order_book_config: market_order.order_book_config,
                        order_position_config: market_order.position_config,
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

        println!(
            "NEXT POSITION POINTER: {:?}",
            (target_amount == 0 && next_position_pointer.is_some())
                .then(|| next_position_pointer.unwrap())
        );
        println!("TARGET AMOUNT: {:?}", target_amount);
        println!("NEXT POSITION POINTER: {:?}", next_position_pointer);

        ixs.push(create_market_order(
            market_order.signer,
            market_order.order_book_config,
            market_pointer,
            order_position,
            source_vault,
            dest_vault,
            source_capital,
            dest_capital,
            source_mint,
            destination_mint,
            source_program,
            (target_amount == 0 && next_position_pointer.is_some())
                .then(|| next_position_pointer.unwrap()),
            market_order.order_type,
            market_order.fill,
            market_order.target_amount,
        ));

        list.push(
            VersionedTransaction::try_new(
                VersionedMessage::V0(Message::try_compile(&payer, &ixs, &[], recent_blockhash)?),
                &[&NullSigner::new(&payer)],
            )
            .unwrap(),
        );

        for position in positions.iter() {
            let mut ixs = vec![];

            ixs.push(fill_market_order(
                market_order.signer,
                market_order.order_book_config,
                market_pointer,
                source_vault,
                position.5,
                position.4,
                dest_vault,
                position.0,
                token_mint_a,
                token_mint_b,
                token_program_a,
                token_program_b,
            ));

            let amount = position.13;
            (amount == 0).then(|| {
                ixs.push(close_order_position(
                    market_order.signer,
                    position.3,
                    market_order.order_book_config,
                    position.0,
                    position.1,
                    position.4,
                    position.5,
                    position.6,
                    position.7,
                    position.8,
                    position.9,
                    position.10,
                    position.11,
                ))
            });

            list.push(
                VersionedTransaction::try_new(
                    VersionedMessage::V0(Message::try_compile(
                        &payer,
                        &ixs,
                        &[],
                        recent_blockhash,
                    )?),
                    &[&NullSigner::new(&payer)],
                )
                .unwrap(),
            );
        }

        let ixs = vec![return_execution_market_order(
            market_order.signer,
            market_order.order_book_config,
            market_pointer,
            source_vault,
            dest_vault,
            source_capital,
            dest_capital,
            source_mint,
            destination_mint,
            source_program,
            destination_program,
        )];

        list.push(
            VersionedTransaction::try_new(
                VersionedMessage::V0(Message::try_compile(&payer, &ixs, &[], recent_blockhash)?),
                &[&NullSigner::new(&payer)],
            )
            .unwrap(),
        );
    };

    Ok(list)
}

pub struct MarketOrderTransactions {
    pub create_market_order: String,
    pub fill_market_order: Vec<String>,
    pub complete_market_order: String,
}

pub fn close_order_position(
    signer: Pubkey,
    owner: Pubkey,
    order_book_config: Pubkey,
    order_position: Pubkey,
    order_position_config: Pubkey,
    source: Pubkey,
    dest: Pubkey,
    capital_source: Pubkey,
    capital_dest: Pubkey,
    token_mint_source: Pubkey,
    token_mint_dest: Pubkey,
    source_program: Pubkey,
    dest_program: Pubkey,
) -> Instruction {
    Instruction {
        program_id,
        accounts: ToAccountMetas::to_account_metas(
            &accounts::CloseOrderPosition {
                signer,
                owner,
                order_book_config,
                order_position,
                order_position_config,
                source,
                dest,
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
    }
}

pub fn create_market_order(
    signer: Pubkey,
    order_book_config: Pubkey,
    market_pointer: Pubkey,
    order_position: Pubkey,
    source: Pubkey,
    dest: Pubkey,
    capital_source: Pubkey,
    capital_dest: Pubkey,
    token_mint_source: Pubkey,
    token_mint_dest: Pubkey,
    source_program: Pubkey,
    next_position_pointer: Option<Pubkey>,
    order_type: Order,
    fill: Fill,
    target_amount: u64,
) -> Instruction {
    Instruction {
        program_id,
        accounts: ToAccountMetas::to_account_metas(
            &accounts::CreateMarketOrder {
                signer,
                order_book_config,
                market_pointer,
                order_position,
                source,
                dest,
                capital_source,
                capital_dest,
                token_mint_source,
                token_mint_dest,
                source_program,
                next_position_pointer,
            },
            None,
        ),
        data: InstructionData::data(&instruction::CreateMarketOrder {
            order_type,
            fill,
            target_amount,
        }),
    }
}

pub fn fill_market_order(
    signer: Pubkey,
    order_book_config: Pubkey,
    market_pointer: Pubkey,
    order_position: Pubkey,
    taker_source: Pubkey,
    maker_destination: Pubkey,
    maker_source: Pubkey,
    taker_destination: Pubkey,
    token_mint_a: Pubkey,
    token_mint_b: Pubkey,
    token_program_a: Pubkey,
    token_program_b: Pubkey,
) -> Instruction {
    Instruction {
        program_id,
        accounts: ToAccountMetas::to_account_metas(
            &accounts::FillMarketOrder {
                signer,
                order_book_config,
                market_pointer,
                order_position,
                taker_source,
                maker_destination,
                maker_source,
                taker_destination,
                token_mint_a,
                token_mint_b,
                token_program_a,
                token_program_b,
            },
            None,
        ),
        data: InstructionData::data(&instruction::FillMarketOrder {}),
    }
}

pub fn return_execution_market_order(
    signer: Pubkey,
    order_book_config: Pubkey,
    market_pointer: Pubkey,
    source: Pubkey,
    dest: Pubkey,
    capital_source: Pubkey,
    capital_dest: Pubkey,
    token_mint_source: Pubkey,
    token_mint_dest: Pubkey,
    source_program: Pubkey,
    dest_program: Pubkey,
) -> Instruction {
    Instruction {
        program_id,
        accounts: ToAccountMetas::to_account_metas(
            &accounts::ReturnExecutionMarketOrder {
                signer,
                order_book_config,
                market_pointer,
                source,
                dest,
                capital_source,
                capital_dest,
                token_mint_source,
                token_mint_dest,
                source_program,
                dest_program,
            },
            None,
        ),
        data: InstructionData::data(&instruction::ReturnExecutionMarketOrder {}),
    }
}
