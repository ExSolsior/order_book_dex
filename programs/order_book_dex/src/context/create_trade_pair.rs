use crate::constants::ORDER_BOOK_CONFIG;
use crate::errors::ErrorCode;
use crate::state::OrderBookConfig;
use anchor_lang::prelude::*;
use anchor_spl::token_interface::Mint;

#[derive(Accounts)]
pub struct CreateTradePair<'info> {
    #[account(
        mut,
        // constraint = authority.key == AUTH_ID,
    )]
    pub authority: Signer<'info>,

    #[account(
        constraint = OrderBookConfig::is_valid_mints(
            &token_mint_a.to_account_info(),
            &token_mint_b.to_account_info(),
            &token_program_a.to_account_info(),
            &token_program_b.to_account_info(),
        ) @ ErrorCode::InvalidMints,
        init,
        payer = authority,
        space = OrderBookConfig::LEN,
        seeds = [
            token_mint_a.key().as_ref(),
            token_mint_b.key().as_ref(),
            ORDER_BOOK_CONFIG.as_bytes(),
        ],
        bump
    )]
    pub config: Account<'info, OrderBookConfig>,

    pub token_mint_a: InterfaceAccount<'info, Mint>,
    pub token_mint_b: InterfaceAccount<'info, Mint>,

    /// CHECK: only need the pubkey to sync with token_mint_a
    pub token_program_a: UncheckedAccount<'info>,

    /// CHECK: only need the pubkey to sync with token_mint_b
    pub token_program_b: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> CreateTradePair<'info> {
    pub fn initialize(&mut self, is_reverse: bool) -> Result<()> {
        self.config.init(
            self.token_program_a.key(),
            self.token_program_b.key(),
            self.token_mint_a.key(),
            self.token_mint_b.key(),
            is_reverse,
        );

        msg!("New Trade Pair Created: {}", self.config.key());

        Ok(())
    }
}
