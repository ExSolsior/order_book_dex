use super::{
    constants::RPC_ENDPOINT, error::TransactionBuildError, pdas::*,
    util::create_versioned_tx,
};
use anchor_lang::{InstructionData, ToAccountMetas};
use order_book_dex::{accounts, instruction, ID as program_id};
use solana_client::nonblocking::rpc_client::RpcClient;
use solana_sdk::{
    commitment_config::CommitmentConfig, instruction::Instruction, pubkey::Pubkey,
    system_program::ID as system_program, transaction::VersionedTransaction,
};

pub async fn create_market_order(
    signer: Pubkey,
    order_book_config: Pubkey,
    market_pointer: Pubkey,
    token_mint_source: Pubkey,
    token_mint_dest: Pubkey,
    next_position_pointer: Pubkey,
    order_type: Order,
    fill: Fill,
    target_amount: u64,
    is_reverse: bool,
) -> Result<VersionedTransaction, TransactionBuildError> {
    let rpc_client =
        RpcClient::new_with_commitment(RPC_ENDPOINT.to_string(), CommitmentConfig::confirmed());

    let source = if (!is_reverse && order_type == Order::Buy) || (is_reverse && order_type == Order::Sell) {
        get_vault_account_pda(order_book_config, token_mint_source, signer)
    } else {
        get_vault_account_pda(order_book_config, token_mint_dest, signer)
    };

    let dest = if (!is_reverse && order_type == Order::Buy) || (is_reverse && order_type == Order::Sell) {
        get_vault_account_pda(order_book_config, token_mint_dest, signer)
    } else {
        get_vault_account_pda(order_book_config, token_mint_source, signer)
    };

    let ix = Instruction {
        program_id,
        accounts: ToAccountMetas::to_account_metas(
            &accounts::CreateMarketOrder {
                signer,
                order_book_config,
                market_pointer,
                source,
                dest,
                token_mint_source,
                token_mint_dest,
                next_position_pointer,
            },
            None,
        ),
        data: InstructionData::data(&instruction::CreateMarketOrder {
            order_type,
            fill,
            target_amount,
        }),
    };

    let tx = create_versioned_tx(&rpc_client, &signer, vec![ix]).await?;
    Ok(tx)
}