use super::{
    error::TransactionBuildError,
    pdas::*,
    util::{create_rpc_client, create_versioned_tx},
};
use anchor_lang::{InstructionData, ToAccountMetas};
use order_book_dex::{accounts, instruction, ID as program_id};
use solana_sdk::{
    account::Account, instruction::Instruction, pubkey::Pubkey,
    system_program::ID as system_program, transaction::VersionedTransaction,
};

#[derive(Debug, Clone)]
pub struct CreateTradePairParams {
    pub signer: Pubkey,
    pub token_mint_a: Pubkey,
    pub token_mint_b: Pubkey,
    pub token_symbol_a: String,
    pub token_symbol_b: String,
    pub is_reverse: bool,
}

pub async fn create_trade_pair(
    params: CreateTradePairParams,
) -> Result<VersionedTransaction, TransactionBuildError> {
    let rpc_client = create_rpc_client();
    let signer = params.signer;

    // Derive token programs from mints
    let mint_a = rpc_client.get_account(&params.token_mint_a).await?;
    let mint_b = rpc_client.get_account(&params.token_mint_b).await?;

    let ixs = build_ixs(params, &mint_a, &mint_b);
    let tx = create_versioned_tx(&rpc_client, &signer, &ixs).await?;
    Ok(tx)
}

// Separate function for testing
fn build_ixs(
    params: CreateTradePairParams,
    mint_a: &Account,
    mint_b: &Account,
) -> Vec<Instruction> {
    let CreateTradePairParams {
        signer,
        token_mint_a,
        token_mint_b,
        token_symbol_a,
        token_symbol_b,
        is_reverse,
    } = params;

    let order_book_config = get_order_book_config_pda(token_mint_a, token_mint_b);
    let buy_market_pointer = get_buy_market_pointer_pda(order_book_config);
    let sell_market_pointer = get_sell_market_pointer_pda(order_book_config);

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
    vec![ix]
}

#[cfg(test)]
mod tests {
    use std::str::FromStr;

    use solana_sdk::signer::Signer;

    use crate::transactions::test_util::*;

    use super::*;

    #[tokio::test]
    async fn test_create_trade_pair_tx() {
        let (program_test, signer) = setup();
        let (mut banks_client, _, _) = program_test.start().await;

        let token_mint_a = Pubkey::from_str(JUP_MINT).unwrap();
        let token_mint_b = Pubkey::from_str(USDC_MINT).unwrap();

        let params = CreateTradePairParams {
            signer: signer.pubkey(),
            token_mint_a,
            token_mint_b,
            token_symbol_a: "JUP".to_string(),
            token_symbol_b: "USDC".to_string(),
            is_reverse: false,
        };

        let mint_a = banks_client
            .get_account(params.token_mint_a)
            .await
            .unwrap()
            .unwrap();
        let mint_b = banks_client
            .get_account(params.token_mint_b)
            .await
            .unwrap()
            .unwrap();

        let ixs = build_ixs(params, &mint_a, &mint_b);
        let tx = create_banks_client_verioned_tx(&mut banks_client, &signer.pubkey(), &ixs).await;
        banks_client.process_transaction(tx).await.unwrap();
    }
}
