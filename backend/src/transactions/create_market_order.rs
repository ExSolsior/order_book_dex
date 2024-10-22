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

/// Parameters required to create a market order.
#[derive(Debug, Clone)]
pub struct CreateMarketOrderParams {
    pub signer: Pubkey,
    pub order_book_config: Pubkey,
    pub market_pointer: Pubkey,
    pub token_mint_source: Pubkey,
    pub token_mint_dest: Pubkey,
    pub next_position_pointer: Pubkey,
    pub order_type: Order,
    pub fill: Fill,
    pub target_amount: u64,
    pub is_reverse: bool,
}

/// Creates a market order transaction.
pub async fn create_market_order(
    params: CreateMarketOrderParams
) -> Result<VersionedTransaction, TransactionBuildError> {
    let rpc_client =
        RpcClient::new_with_commitment(RPC_ENDPOINT.to_string(), CommitmentConfig::confirmed());
    let signer = params.signer;

    // Build the instructions for the transaction.
    let ixs = build_ixs(params);
    
    // Create a versioned transaction with the signer and instructions.
    let tx = create_versioned_tx(&rpc_client, &signer, &ixs).await?;
    
    Ok(tx)
}

/// Builds the instructions for creating a market order.
pub fn build_ixs(
    params: CreateMarketOrderParams,
) -> Vec<Instruction> {
    let CreateMarketOrderParams {
        signer,
        order_book_config,
        market_pointer,
        token_mint_source,
        token_mint_dest,
        next_position_pointer,
        order_type,
        fill,
        target_amount,
        is_reverse,
    } = params;

    // Determine the source account based on the order type and direction.
    let source = if (!is_reverse && order_type == Order::Buy) || (is_reverse && order_type == Order::Sell) {
        get_vault_account_pda(order_book_config, token_mint_source, signer)
    } else {
        get_vault_account_pda(order_book_config, token_mint_dest, signer)
    };

    // Determine the destination account based on the order type and direction.
    let dest = if (!is_reverse && order_type == Order::Buy) || (is_reverse && order_type == Order::Sell) {
        get_vault_account_pda(order_book_config, token_mint_dest, signer)
    } else {
        get_vault_account_pda(order_book_config, token_mint_source, signer)
    };

    // Create the instruction for the market order.
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

    vec![ix] // Return the instruction as a vector.
}

#[cfg(test)]
// Add tests for the create_market_order function here.