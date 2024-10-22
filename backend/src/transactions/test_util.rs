use std::str::FromStr;

use solana_sdk::{
    instruction::Instruction,
    message::{v0::Message, VersionedMessage},
    native_token::LAMPORTS_PER_SOL,
    pubkey::Pubkey,
    signature::Keypair,
    signer::Signer,
    system_program,
    transaction::VersionedTransaction,
};
use solana_test_framework::{BanksClient, ProgramTest, ProgramTestExtension};

pub const USDC_MINT: &str = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
pub const JUP_MINT: &str = "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN";

pub fn setup() -> (ProgramTest, Keypair) {
    let keypair = Keypair::new();

    let mut program_test = ProgramTest::default();

    program_test.prefer_bpf(true);

    // Add order book dex program
    program_test.add_program("order_book_dex", order_book_dex::ID, None);

    let token_program_id = Pubkey::from_str("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA").unwrap();
    let token_2022_program_id =
        Pubkey::from_str("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb").unwrap();
    let associated_token_program_id =
        Pubkey::from_str("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL").unwrap();

    // Add signer account
    program_test.add_account_with_lamports(
        keypair.pubkey(),
        system_program::ID,
        100 * LAMPORTS_PER_SOL,
    );

    // // Add token program
    // program_test.add_program("token_program.so", token_program_id, None);

    // // Add token 2022 program
    // program_test.add_program("token_2022_program.so", token_2022_program_id, None);

    // // Add associated token program
    // program_test.add_program(
    //     "associated_token_program.so",
    //     associated_token_program_id,
    //     None,
    // );

    let usdc_mint = Pubkey::from_str(USDC_MINT).unwrap();
    let jup_mint = Pubkey::from_str(JUP_MINT).unwrap();

    // Add USDC mint
    program_test.add_token_mint(
        usdc_mint,
        Some(Pubkey::from_str("BJE5MMbqXjVwjAF7oxwPYXnTXDyspzZyt4vwenNw5ruG").unwrap()),
        2_925_883_842,
        6,
        Some(Pubkey::from_str("7dGbd2QZcCKcTndnHcTL8q7SMVXAkp688NTQYwrRCrar").unwrap()),
    );

    // Add USDC associated token account
    program_test.add_associated_token_account(
        usdc_mint,
        keypair.pubkey(),
        10000,
        None,
        None,
        0,
        Some(keypair.pubkey()),
    );

    // Add JUP mint
    program_test.add_token_mint(jup_mint, None, 999_979_496, 6, None);

    // Add JUP associated token account
    program_test.add_associated_token_account(
        jup_mint,
        keypair.pubkey(),
        10000,
        None,
        None,
        0,
        Some(keypair.pubkey()),
    );

    (program_test, keypair)
}

pub async fn create_banks_client_verioned_tx(
    banks_client: &mut BanksClient,
    payer: &Keypair,
    ixs: &[Instruction],
) -> VersionedTransaction {
    let recent_blockhash = banks_client.get_latest_blockhash().await.unwrap();

    VersionedTransaction::try_new(
        VersionedMessage::V0(
            Message::try_compile(&payer.pubkey(), ixs, &[], recent_blockhash).unwrap(),
        ),
        &[payer],
    )
    .unwrap()
}
