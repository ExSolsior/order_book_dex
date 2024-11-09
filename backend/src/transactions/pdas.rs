use order_book_dex::{constants::*, ID as program_id};
use solana_sdk::pubkey::Pubkey;

pub fn get_order_book_config_pda(token_mint_a: Pubkey, token_mint_b: Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[
            token_mint_a.as_ref(),
            token_mint_b.as_ref(),
            ORDER_BOOK_CONFIG_SEED.as_bytes(),
        ],
        &program_id,
    )
    .0
}

pub fn get_buy_market_pointer_pda(order_book_config: Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[
            BUY_SEED.as_bytes(),
            order_book_config.as_ref(),
            MARKET_POINTER_SEED.as_bytes(),
        ],
        &program_id,
    )
    .0
}

pub fn get_sell_market_pointer_pda(order_book_config: Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[
            SELL_SEED.as_bytes(),
            order_book_config.as_ref(),
            MARKET_POINTER_SEED.as_bytes(),
        ],
        &program_id,
    )
    .0
}

pub fn get_vault_account_pda(
    order_book_config: Pubkey,
    token_mint: Pubkey,
    signer: Pubkey,
) -> Pubkey {
    Pubkey::find_program_address(
        &[
            order_book_config.as_ref(),
            token_mint.as_ref(),
            signer.as_ref(),
            VAULT_ACCOUNT_SEED.as_bytes(),
        ],
        &program_id,
    )
    .0
}

pub fn get_order_position_config_pda(signer: Pubkey, order_book_config: Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[
            signer.as_ref(),
            order_book_config.as_ref(),
            ORDER_POSITION_CONFIG_SEED.as_bytes(),
        ],
        &program_id,
    )
    .0
}

pub fn get_order_position_pda(nonce: u64, position_config: Pubkey, signer: Pubkey) -> Pubkey {
    let a = Pubkey::find_program_address(
        &[
            nonce.to_le_bytes().as_ref(),
            position_config.as_ref(),
            signer.as_ref(),
            ORDER_POSITION_SEED.as_bytes(),
        ],
        &program_id,
    )
    .0;

    let b = Pubkey::find_program_address(
        &[
            nonce.to_le_bytes().as_ref(),
            signer.as_ref(),
            ORDER_POSITION_SEED.as_bytes(),
        ],
        &program_id,
    )
    .0;

    println!(":::: {}", a);
    println!(":::: {}", b);

    Pubkey::find_program_address(
        &[
            nonce.to_le_bytes().as_ref(),
            position_config.as_ref(),
            signer.as_ref(),
            ORDER_POSITION_SEED.as_bytes(),
        ],
        &program_id,
    )
    .0
}
