pub async fn execute_market_order(
    //
    app_state: web::Data<AppState>,
    signer: Pubkey,
    order_book_config: Pubkey,
    order_type: Order,
    fill_type: String,
    target_price: u64,
    target_amount: u64,
) {
    let order_book_data = get_trade_pair(&order_book_config, app_state).await?;

    if order_type == Order::Sell && order_book_data["book"]["bids"].is_null()
        || order_type == Order::Buy && order_book_data["book"]["asks"].is_null()
    {
        // return error
    }

    // order_position
    // source_vault -> maker_source
    // destionation_vault -> maker_destination
    // market_maker
    // source_capital
    // destination_capital
    // order_position_config
    // token_mint_source
    // token_mint_destination

    // I need to figure out how to determine this
    // source_program
    // destination_program

    // token_mint_a
    // toekn_mint_b
    // token_program_a
    // token_program_b

    let positions = match order_type {
        Order::Sell => {
            let mut list = vec![];
            let mut target_amount = target_amount;
            let mut next: Option<Pubkey> = Some(
                Pubkey::from_str(
                    order_book_data["book"]["bids"][0]["pubkeyId"]
                        .as_str()
                        .unwrap(),
                )
                .unwrap(),
            );
            if let Some(bids) = order_book_data["book"]["bids"].as_array() {
                for bid in bids {
                    let price = u64::from_be_bytes(
                        bid["price"].as_bytes()[..8]
                            .try_into()
                            .expect("expected 8 bytes"),
                    );

                    let amount = u64::from_be_bytes(
                        bid["amount"].as_bytes()[..8]
                            .try_into()
                            .expect("expected 8 bytes"),
                    );

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

                    let (source_mint, source_program) = if (!is_reverse) {
                        (token_mint_b, token_program_b)
                    } else {
                        (token_mint_a, token_program_a)
                    };

                    let (destination_mint, destination_program) = if (!is_reverse) {
                        (token_mint_a, token_program_a)
                    } else {
                        (token_mint_b, token_program_b)
                    };

                    let market_maker =
                        Pubkey::from_str(bid["marketMaker"].as_str().unwrap()).unwrap();
                    let next_postion = (!bid["nextPosition"].is_null())
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

                    let next = next_position.clone();
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
                        destionation_mint,
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
            let mut target_amount = target_amount;
            let mut next: Option<Pubkey> = Some(
                Pubkey::from_str(
                    order_book_data["book"]["asks"][0]["pubkeyId"]
                        .as_str()
                        .unwrap(),
                )
                .unwrap(),
            );
            if let Some(asks) = order_book_data["book"]["asks"].as_array() {
                for ask in asks {
                    let price = u64::from_be_bytes(
                        ask["price"].as_bytes()[..8]
                            .try_into()
                            .expect("expected 8 bytes"),
                    );

                    let amount = u64::from_be_bytes(
                        ask["amount"].as_bytes()[..8]
                            .try_into()
                            .expect("expected 8 bytes"),
                    );

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

                    let (source_mint, source_program) = if (!is_reverse) {
                        (token_mint_a, token_program_a)
                    } else {
                        (token_mint_b, token_program_b)
                    };

                    let (destination_mint, destination_program) = if (!is_reverse) {
                        (token_mint_b, token_program_b)
                    } else {
                        (token_mint_a, token_program_a)
                    };

                    let market_maker =
                        Pubkey::from_str(bid["marketMaker"].as_str().unwrap()).unwrap();
                    let next_postion = (!bid["nextPosition"].is_null())
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

                    let next = next_position.clone();
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
                        destionation_mint,   // 9
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

    let list: Vec<VersionedTransaction>::new();
    let recent_blockhash = rpc_client.get_latest_blockhash().await?;

    if positions.len() == 1 {
        let ixs = vec![
            create_market_order(
                signer,
                order_book_config,
                market_pointer,
                positions[0].0,
                source,
                dest,
                capital_source,
                capital_dest,
                positions[0].8,
                positions[0].9,
                positions[0].10,
                // is this correct?
                positions[0].0,
            ),
            fill_market_order(
                signer,
                order_book_config,
                market_pointer,
                taker_source,
                positions[0].5,
                positions[0].4,
                taker_destination,
                positions[0].0,
                token_mint_a,
                token_mint_b,
                token_program_a,
                token_program_b,
            ),
        ];
        (amount == 0).then(|| {
            ixs.push(close_order_position(
                signer,
                positions[0].3,
                order_book_config,
                positions[0].0,
                positions[0].1,
                positions[0].4,
                positions[0].5,
                positions[0].6,
                positions[0].7,
                positions[0].8,
                positions[0].9,
                positions[0].10,
                positions[0].11,
                system_program,
            ))
        });
        ixs.push(return_execution_market_order(
            signer,
            order_book_config,
            market_pointer,
            source,
            dest,
            capital_source,
            capital_dest,
            positions[0].8,
            positions[0].9,
            positions[0].10,
            positions[0].11,
        ));

        list.push(
            VersionedTransaction::try_new(
                VersionedMessage::V0(Message::try_compile(payer, ixs, &[], recent_blockhash)?),
                &[&NullSigner::new(payer)],
            )
            .unwrap(),
        );
    } else {
        let ixs = vec![create_market_order(
            signer,
            order_book_config,
            market_pointer,
            positions[0].0,
            source,
            dest,
            capital_source,
            capital_dest,
            positions[0].8,
            positions[0].9,
            positions[0].10,
            // is this correct?
            positions[positions.len() - 1].0,
        )];

        list.push(
            VersionedTransaction::try_new(
                VersionedMessage::V0(Message::try_compile(payer, ixs, &[], recent_blockhash)?),
                &[&NullSigner::new(payer)],
            )
            .unwrap(),
        );

        for position in positions.iter() {
            let ixs = vec![];

            ixs.push(fill_market_order(
                signer,
                order_book_config,
                market_pointer,
                taker_source,
                position.5,
                position.4,
                taker_destination,
                position.0,
                token_mint_a,
                token_mint_b,
                token_program_a,
                token_program_b,
            ));
            (amount == 0).then(|| {
                ixs.push(close_order_position(
                    signer,
                    position.3,
                    order_book_config,
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
                    system_program,
                ))
            });

            list.push(
                VersionedTransaction::try_new(
                    VersionedMessage::V0(Message::try_compile(payer, ixs, &[], recent_blockhash)?),
                    &[&NullSigner::new(payer)],
                )
                .unwrap(),
            );
        }

        let ixs = vec![return_execution_market_order(
            signer,
            order_book_config,
            market_pointer,
            source,
            dest,
            capital_source,
            capital_dest,
            positions[0].8,
            positions[0].9,
            positions[0].10,
            positions[0].11,
        )];
        list.push(
            VersionedTransaction::try_new(
                VersionedMessage::V0(Message::try_compile(payer, ixs, &[], recent_blockhash)?),
                &[&NullSigner::new(payer)],
            )
            .unwrap(),
        );
    }
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
    system_program: Pubkey,
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
    next_position_pointer: Pubkey,
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
