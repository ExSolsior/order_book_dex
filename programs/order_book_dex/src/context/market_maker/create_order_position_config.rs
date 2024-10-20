use crate::constants::{ORDER_POSITION_CONFIG_SEED, VAULT_ACCOUNT_SEED};
use crate::events::NewOrderPositionConfigEvent;
use crate::state::{OrderBookConfig, OrderPositionConfig};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct CreateOrderPositionConfig<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    pub order_book_config: Account<'info, OrderBookConfig>,

    #[account(
        init,
        payer = signer,
        space = OrderPositionConfig::LEN,
        seeds = [
            signer.key().as_ref(),
            order_book_config.key().as_ref(),
            ORDER_POSITION_CONFIG_SEED.as_bytes(),
        ],
        bump
    )]
    pub order_position_config: Account<'info, OrderPositionConfig>,

    pub system_program: Program<'info, System>,
}

impl<'info> CreateOrderPositionConfig<'info> {
    pub fn init(&mut self, program_id: &Pubkey) -> Result<()> {
        self.order_position_config
            .init(self.order_book_config.key(), self.signer.key());

        let vault_a = Pubkey::find_program_address(
            &[
                self.order_book_config.key().as_ref(),
                self.order_book_config.token_mint_a.as_ref(),
                self.signer.key().as_ref(),
                VAULT_ACCOUNT_SEED.as_bytes(),
            ],
            program_id,
        )
        .0;

        let vault_b = Pubkey::find_program_address(
            &[
                self.order_book_config.key().as_ref(),
                self.order_book_config.token_mint_b.as_ref(),
                self.signer.key().as_ref(),
                VAULT_ACCOUNT_SEED.as_bytes(),
            ],
            program_id,
        )
        .0;

        let Clock {
            slot,
            unix_timestamp,
            ..
        } = Clock::get()?;

        emit!(NewOrderPositionConfigEvent {
            book_config: self.order_book_config.key(),
            pos_config: self.order_position_config.key(),
            market_maker: self.signer.key(),
            vault_a,
            vault_b,
            slot: slot,
            timestamp: unix_timestamp,
        });

        Ok(())
    }
}
