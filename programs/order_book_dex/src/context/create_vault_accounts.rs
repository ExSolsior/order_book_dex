use crate::constants::VAULT_ACCOUNT_SEED;
use crate::errors::ErrorCode;
use crate::state::OrderBookConfig;
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

#[derive(Accounts)]
pub struct CreateVaultAccounts<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    pub order_book_config: Account<'info, OrderBookConfig>,

    #[account(
        constraint = order_book_config.token_mint_a == token_mint_a.key()
            @ ErrorCode::InvalidMint,
    )]
    pub token_mint_a: InterfaceAccount<'info, Mint>,

    #[account(
        constraint = order_book_config.token_mint_b == token_mint_b.key()
            @ ErrorCode::InvalidMint,
    )]
    pub token_mint_b: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        payer = signer,
        seeds = [
            order_book_config.key().as_ref(),
            token_mint_a.key().as_ref(),
            signer.key().as_ref(),
            VAULT_ACCOUNT_SEED.as_bytes(),
        ],
        bump,
        token::mint = token_mint_a,
        token::authority = order_book_config,
        token::token_program = token_program_a,
    )]
    pub vault_a: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init,
        payer = signer,
        seeds = [
            order_book_config.key().as_ref(),
            token_mint_b.key().as_ref(),
            signer.key().as_ref(),
            VAULT_ACCOUNT_SEED.as_bytes(),
        ],
        bump,
        token::mint = token_mint_b,
        token::authority = signer,
        token::token_program = token_program_b,
    )]
    pub vault_b: InterfaceAccount<'info, TokenAccount>,

    #[account(
        constraint = order_book_config.token_program_a == token_program_a.key()
            @ ErrorCode::InvalidTokenProgram,
    )]
    pub token_program_a: Interface<'info, TokenInterface>,

    #[account(
        constraint = order_book_config.token_program_b == token_program_b.key()
            @ ErrorCode::InvalidTokenProgram,
    )]
    pub token_program_b: Interface<'info, TokenInterface>,

    pub system_program: Program<'info, System>,
}

impl<'info> CreateVaultAccounts<'info> {
    pub fn initialize(&mut self) -> Result<()> {
        msg!("order escrows created");

        Ok(())
    }
}
