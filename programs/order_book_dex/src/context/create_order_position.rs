use crate::constants::ORDER_POSITION_SEED;
use crate::state::{Order, OrderBookConfig, OrderPosition, OrderPositionConfig};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{transfer_checked, Mint, TokenAccount, TransferChecked};

#[derive(Accounts)]
#[instruction(order_type: Order)]
pub struct CreateOrderPosition<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    pub order_book_config: Account<'info, OrderBookConfig>,

    #[account(
        mut,
        constraint = order_position_config.is_valid_order_book_config(order_book_config.key()),
        constraint = order_position_config.is_valid_owner(signer.key()),
    )]
    pub order_position_config: Account<'info, OrderPositionConfig>,

    #[account(
        init,
        payer = signer,
        space = OrderPosition::LEN,
        seeds = [
            order_position_config.nonce.to_le_bytes().as_ref(),
            signer.key().as_ref(),
            ORDER_POSITION_SEED.as_bytes(),
        ],
        bump,
    )]
    pub order_position: Account<'info, OrderPosition>,

    #[account(
        constraint = order_book_config.token_mint_a == token_mint_a.key(),
    )]
    pub token_mint_a: InterfaceAccount<'info, Mint>,

    #[account(
        constraint = order_book_config.token_mint_b == token_mint_b.key(),
    )]
    pub token_mint_b: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        constraint = captial_source.mint == source.mint
    )]
    pub captial_source: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        constraint = order_position.is_valid_source(&order_book_config, &source, order_type.clone()),
    )]
    pub source: InterfaceAccount<'info, TokenAccount>,

    #[account(
        constraint = order_position.is_valid_destination(&order_book_config, &source, order_type.clone()),
    )]
    pub destination: InterfaceAccount<'info, TokenAccount>,

    #[account(
        constraint = order_book_config.token_program_a == token_program_a.key(),
    )]
    /// CHECK: only need the pubkey to sync with token_mint_a
    pub token_program_a: UncheckedAccount<'info>,

    #[account(
        constraint = order_book_config.token_program_b == token_program_b.key(),
    )]
    /// CHECK: only need the pubkey to sync with token_mint_b
    pub token_program_b: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> CreateOrderPosition<'info> {
    pub fn exec(&mut self, order_type: Order, price: u64, amount: u64) -> Result<()> {
        self.order_position_config.inc_nonce();

        self.order_position.init(
            self.order_book_config.key(),
            self.order_position_config.key(),
            self.source.key(),
            self.destination.key(),
            order_type,
            price,
            amount,
        )?;

        let source_program = *self.source.to_account_info().owner;

        let (token_program, token_mint) = if source_program == self.token_program_a.key() {
            (self.token_program_a.clone(), self.token_mint_a.clone())
        } else {
            (self.token_program_b.clone(), self.token_mint_b.clone())
        };

        transfer_checked(
            CpiContext::new(
                token_program.to_account_info(),
                TransferChecked {
                    from: self.captial_source.to_account_info(),
                    to: self.source.to_account_info(),
                    authority: self.signer.to_account_info(),
                    mint: token_mint.to_account_info(),
                },
            ),
            amount,
            token_mint.decimals,
        )?;

        Ok(())
    }
}
