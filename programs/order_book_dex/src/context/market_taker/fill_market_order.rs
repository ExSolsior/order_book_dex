use crate::{
    constants::ORDER_BOOK_CONFIG_SEED,
    state::{MarketPointer, OrderBookConfig, OrderPosition},
};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{transfer_checked, Mint, TokenAccount, TransferChecked};

#[derive(Accounts)]
pub struct FillMarketOrder<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    pub order_book_config: Account<'info, OrderBookConfig>,

    #[account(
        mut,
        constraint = market_pointer.is_valid_execution(),
        constraint = market_pointer.is_valid_market_order_owner(signer.key()),
        constraint = market_pointer.is_valid_order_book_config(order_book_config.key()),
    )]
    pub market_pointer: Account<'info, MarketPointer>,

    #[account(
        mut,
        constraint = order_position.is_valid_order_book_config(order_book_config.key()),
        constraint = market_pointer.is_valid_order_pointer(order_position.key()),
    )]
    pub order_position: Account<'info, OrderPosition>,

    #[account(
        mut,
        constraint = maker_source.mint == taker_destination.mint,
        constraint = taker_source.owner == order_book_config.key(),
        constraint = market_pointer.is_valid_source(taker_source.key()),
    )]
    pub taker_source: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        constraint = maker_destination.owner == order_book_config.key(),
        constraint = order_position.is_valid_destination(
            &order_book_config, 
            &maker_destination, 
            market_pointer.order_type.clone(),
        ),
    )]
    pub maker_destination: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        constraint = maker_source.mint == taker_destination.mint,
        constraint = maker_source.owner == order_book_config.key(),
        constraint = order_position.is_valid_source(         
            &order_book_config, 
            &maker_source, 
            market_pointer.order_type.clone(),
        ),
    )]
    pub maker_source: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        constraint = taker_destination.owner == order_book_config.key(),
        constraint = market_pointer.is_valid_dest(taker_destination.key()),
    )]
    pub taker_destination: InterfaceAccount<'info, TokenAccount>,

    #[account(
        constraint = order_book_config.token_mint_a == token_mint_a.key()
    )]
    pub token_mint_a: InterfaceAccount<'info, Mint>,

    #[account(
        constraint = order_book_config.token_mint_b == token_mint_b.key()
    )]
    pub token_mint_b: InterfaceAccount<'info, Mint>,

    #[account(
        constraint = order_book_config.token_program_a == token_program_a.key()
    )]
    /// CHECK: apparently this works -> if necessary will set as Program<>
    pub token_program_a: UncheckedAccount<'info>,

    #[account(
        constraint = order_book_config.token_program_b == token_program_b.key()
    )]
    /// CHECK: apparently this works -> if necessary will set as Program<>
    pub token_program_b: UncheckedAccount<'info>,
}

impl<'info> FillMarketOrder<'info> {
    pub fn exec(&mut self) -> Result<()> {
        let (token_mint_a, token_mint_b, token_program_a, token_program_b) =
            if !self.order_book_config.is_reverse {
                (
                    &self.token_mint_a,
                    &self.token_mint_b,
                    &self.token_program_a,
                    &self.token_program_b,
                )
            } else {
                (
                    &self.token_mint_b,
                    &self.token_mint_a,
                    &self.token_program_b,
                    &self.token_program_a,
                )
            };

        let amount = self
            .order_position
            .update(&self.market_pointer.market_order.as_ref().unwrap());

        let (sending_amount, receiving_amount) = self
            .market_pointer
            .update(&mut self.order_position, amount)?;

        let token_mint_a_key = self.token_mint_a.key();
        let token_mint_b_key = self.token_mint_b.key();
        let bump = &[self.order_book_config.bump];

        let signer_seeds = &[&[
            token_mint_a_key.as_ref(),
            token_mint_b_key.as_ref(),
            ORDER_BOOK_CONFIG_SEED.as_bytes(),
            bump,
        ][..]];

        // taker_source -> maker_destination
        transfer_checked(
            CpiContext::new_with_signer(
                token_program_a.to_account_info(),
                TransferChecked {
                    from: self.taker_source.to_account_info(),
                    to: self.maker_destination.to_account_info(),
                    authority: self.order_book_config.to_account_info(),
                    mint: token_mint_a.to_account_info(),
                },
                signer_seeds,
            ),
            sending_amount,
            token_mint_a.decimals,
        )?;

        // maker_source -> taker_destination
        transfer_checked(
            CpiContext::new_with_signer(
                token_program_b.to_account_info(),
                TransferChecked {
                    from: self.maker_source.to_account_info(),
                    to: self.taker_destination.to_account_info(),
                    authority: self.order_book_config.to_account_info(),
                    mint: token_mint_b.to_account_info(),
                },
                signer_seeds,
            ),
            receiving_amount,
            token_mint_b.decimals,
        )?;
        Ok(())
    }
}
