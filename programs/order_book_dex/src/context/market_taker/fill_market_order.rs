use crate::{
    constants::ORDER_BOOK_CONFIG_SEED, errors::ErrorCode, events::MarketOrderFillEvent, state::{MarketPointer, Order, OrderBookConfig, OrderPosition}
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
        constraint = market_pointer.is_valid_order_book_config(order_book_config.key())
            @ ErrorCode::InvalidMarketPointer,
        constraint = market_pointer.is_valid_execution()
            @ ErrorCode::MarketOrderNotInProgress,
        constraint = market_pointer.is_valid_market_order_owner(signer.key())
            @ ErrorCode::InvalidMarketOrderOwner,
        constraint = market_pointer.is_valid_fill(order_position.price)
            @ ErrorCode::InvalidFillOfMarketOrder,
    )]
    pub market_pointer: Account<'info, MarketPointer>,

    #[account(
        mut,
        constraint = order_position.is_valid_order_book_config(order_book_config.key())
            @ ErrorCode::InvalidOrderPosition,
        constraint = market_pointer.is_valid_order_pointer(order_position.key())
            @ ErrorCode::InvalidOrderPosition,
    )]
    pub order_position: Account<'info, OrderPosition>,

    #[account(
        mut,
        constraint = maker_source.mint == taker_destination.mint
            @ ErrorCode::InvalidMint,
        constraint = taker_source.owner == order_book_config.key()
            @ ErrorCode::InvalidVaultAccount,
        constraint = market_pointer.is_valid_source(taker_source.key())
            @ ErrorCode::InvalidTakerSource,
    )]
    pub taker_source: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        constraint = maker_destination.owner == order_book_config.key()
            @ ErrorCode::InvalidVaultAccount,
        constraint = order_book_config.is_valid_token_mint_dest(
            maker_destination.mint, 
            order_position.order_type.clone(),
        ) @ ErrorCode::InvalidMakerDestination,
    )]
    pub maker_destination: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        constraint = maker_source.mint == taker_destination.mint
            @ ErrorCode::InvalidMint,
        constraint = maker_source.owner == order_book_config.key()
            @ ErrorCode::InvalidVaultAccount,
        constraint = order_book_config.is_valid_token_mint_source(         
            maker_source.mint, 
            order_position.order_type.clone(),
        ) @ ErrorCode::InvalidMakerSource,
    )]
    pub maker_source: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        constraint = taker_destination.owner == order_book_config.key()
            @ ErrorCode::InvalidVaultAccount,
        constraint = market_pointer.is_valid_dest(taker_destination.key())
            @ ErrorCode::InvalidTakerDestination,
    )]
    pub taker_destination: InterfaceAccount<'info, TokenAccount>,

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
        constraint = order_book_config.token_program_a == token_program_a.key()
            @ ErrorCode::InvalidTokenProgram,
    )]
    /// CHECK: apparently this works -> if necessary will set as Program<>
    pub token_program_a: UncheckedAccount<'info>,

    #[account(
        constraint = order_book_config.token_program_b == token_program_b.key()
         @ ErrorCode::InvalidTokenProgram,
    )]
    /// CHECK: apparently this works -> if necessary will set as Program<>
    pub token_program_b: UncheckedAccount<'info>,
}

impl<'info> FillMarketOrder<'info> {
    pub fn exec(&mut self) -> Result<()> {
        let (token_mint_a, token_mint_b, token_program_a, token_program_b) =
        if self.market_pointer.order_type == Order::Buy && !self.order_book_config.is_reverse
        || self.market_pointer.order_type == Order::Sell && self.order_book_config.is_reverse {
            (
                &self.token_mint_a,
                &self.token_mint_b,
                &self.token_program_a,
                &self.token_program_b,
            )
        } else if self.market_pointer.order_type == Order::Buy && self.order_book_config.is_reverse
        || self.market_pointer.order_type == Order::Sell && !self.order_book_config.is_reverse  {
            (
                &self.token_mint_b,
                &self.token_mint_a,
                &self.token_program_b,
                &self.token_program_a,
            )
        } else {
            unreachable!()
        };

        // base decimals
        let decimals = if !self.order_book_config.is_reverse {
            self.token_mint_b.decimals as u32
        } else {
            self.token_mint_a.decimals as u32
        };

        let delta_amount = self.market_pointer.delta_amount();
        let balance = self.market_pointer.balance(&self.order_position);
        let (amount, total) = self.order_position.update(
            delta_amount as u128,
            balance as u128,
            decimals,
        );

        self.market_pointer
            .update(&mut self.order_position, amount, total)?;

        let (sending_amount, receiving_amount) = match self.market_pointer.order_type {
            Order::Buy => (total, amount),
            Order::Sell => (amount, total),
            _ => unreachable!(),
        };

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

        let Clock {
            slot,
            unix_timestamp,
            ..
        } = Clock::get()?;

        // probably need to rethink the names of these?
        emit!(MarketOrderFillEvent {
            market_pointer: self.market_pointer.key(),
            book_config: self.order_book_config.key(),
            pos_pubkey: self.order_position.key(),
            order_type: self.market_pointer.order_type.clone(),
            price: self.order_position.price,
            // transfer -> quote
            total: total,
            // transfer -> base
            amount: amount,
            new_size: self.order_position.size - self.order_position.fill,
            fill: self.order_position.fill,
            slot: slot,
            timestamp: unix_timestamp,
            is_available: self.order_position.is_available,
        });

        Ok(())
    }
}
