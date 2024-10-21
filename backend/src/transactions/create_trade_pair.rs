use super::{
    constants::RPC_ENDPOINT, error::TransactionBuildError, pdas::*, util::create_versioned_tx,
};
use anchor_lang::{InstructionData, ToAccountMetas};
use order_book_dex::{accounts, instruction, ID as program_id};
use solana_client::nonblocking::rpc_client::RpcClient;
use solana_sdk::{
    commitment_config::CommitmentConfig, instruction::Instruction, pubkey::Pubkey,
    system_program::ID as system_program, transaction::VersionedTransaction,
};

pub async fn create_trade_pair(
    signer: Pubkey,
    token_mint_a: Pubkey,
    token_mint_b: Pubkey,
    token_symbol_a: String,
    token_symbol_b: String,
    is_reverse: bool,
) -> Result<VersionedTransaction, TransactionBuildError> {
    let rpc_client =
        RpcClient::new_with_commitment(RPC_ENDPOINT.to_string(), CommitmentConfig::confirmed());

    let order_book_config = get_order_book_config_pda(token_mint_a, token_mint_b);
    let buy_market_pointer = get_buy_market_pointer_pda(order_book_config);
    let sell_market_pointer = get_sell_market_pointer_pda(order_book_config);

    // Derive token programs from mints
    let mint_a = rpc_client.get_account(&token_mint_a).await?;
    let mint_b = rpc_client.get_account(&token_mint_b).await?;

    let ix = Instruction {
        program_id,
        accounts: ToAccountMetas::to_account_metas(
            &accounts::CreateTradePair {
                authority: signer,
                order_book_config,
                buy_market_pointer,
                sell_market_pointer,
                token_mint_a,
                token_mint_b,
                token_program_a: mint_a.owner,
                token_program_b: mint_b.owner,
                system_program,
            },
            None,
        ),
        data: InstructionData::data(&instruction::CreateTradePair {
            token_symbol_a,
            token_symbol_b,
            is_reverse,
        }),
    };

    let tx = create_versioned_tx(&rpc_client, &signer, vec![ix]).await?;
    Ok(tx)
}
