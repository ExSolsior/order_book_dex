use crate::constants::ORDER_POSITION_CONFIG_SEED;
use crate::state::{OrderBookConfig, OrderPositionConfig};
use anchor_lang::prelude::*;

#[event_cpi]
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
    pub fn init(&mut self) -> Result<()> {
        self.order_position_config
            .init(self.order_book_config.key(), self.signer.key());

        Ok(())
    }
}
