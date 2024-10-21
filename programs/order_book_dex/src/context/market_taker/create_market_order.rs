use crate::{
    constants::VAULT_ACCOUNT_SEED,
    errors::ErrorCode,
    events::MarketOrderTriggerEvent,
    state::{Fill, MarketPointer, Order, OrderBookConfig, OrderPosition},
};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{transfer_checked, Mint, TokenAccount, TransferChecked};

#[derive(Accounts)]
#[instruction(order_type: Order)]
pub struct CreateMarketOrder<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    pub order_book_config: Box<Account<'info, OrderBookConfig>>,

    #[account(
        mut,
        constraint = market_pointer.is_valid_order_book_config(order_book_config.key())
            @ ErrorCode::InvalidMarketPointer,
        constraint = market_pointer.is_valid_availability()
            @ ErrorCode::MarketOrderAlreadyInProgress,
        constraint = order_type == Order::Buy || order_type == Order::Sell
            @ ErrorCode::InvalidMarketOrder,
    )]
    pub market_pointer: Account<'info, MarketPointer>,

    #[account(
        constraint = market_pointer.execution_stats.as_ref().unwrap().next_position_pointer == order_position.key(),
    )]
    pub order_position: Account<'info, OrderPosition>,

    #[account(
        mut,
        seeds = [
            order_book_config.key().as_ref(),
            token_mint_source.key().as_ref(),
            signer.key().as_ref(),
            VAULT_ACCOUNT_SEED.as_bytes(),
        ],
        bump
    )]
    pub source: InterfaceAccount<'info, TokenAccount>,

    #[account(
        seeds = [
            order_book_config.key().as_ref(),
            token_mint_dest.key().as_ref(),
            signer.key().as_ref(),
            VAULT_ACCOUNT_SEED.as_bytes(),
        ],
        bump
    )]
    pub dest: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::authority = signer.key(),
        associated_token::mint = token_mint_source.key(),
    )]
    pub capital_source: InterfaceAccount<'info, TokenAccount>,

    #[account(
        associated_token::authority = signer.key(),
        associated_token::mint = token_mint_dest.key(),
    )]
    pub capital_dest: InterfaceAccount<'info, TokenAccount>,

    #[account(
        owner = source_program.key(),
        constraint = order_book_config.is_valid_token_mint_source(token_mint_source.key(), market_pointer.order_type.clone())
            @ ErrorCode::InvalidMint,
    )]
    pub token_mint_source: InterfaceAccount<'info, Mint>,

    #[account(
        constraint = order_book_config.is_valid_token_mint_dest(token_mint_dest.key(), market_pointer.order_type.clone())
            @ ErrorCode::InvalidMint,
    )]
    /// CHECKED: validate mint pubkey agaist order book config and market pointer order type
    pub token_mint_dest: UncheckedAccount<'info>,

    /// CHECKED: validate owner of token mint source
    pub source_program: UncheckedAccount<'info>,

    #[account(
        constraint = next_position_pointer.is_valid_order_book_config(order_book_config.key())
            @ ErrorCode::InvalidOrderPosition,
        constraint = next_position_pointer.is_valid_order_type_match(&market_pointer)
            @ ErrorCode::InvalidOrderType,
    )]
    pub next_position_pointer: Account<'info, OrderPosition>,
}

impl<'info> CreateMarketOrder<'info> {
    // I don't think I need the order_type since it already exist on the market pointer
    pub fn exec(&mut self, order_type: Order, fill: Fill, target_amount: u64) -> Result<()> {
        self.market_pointer.add_market_order(
            order_type.clone(),
            fill,
            target_amount,
            self.signer.key(),
            self.source.key(),
            self.dest.key(),
            self.capital_source.key(),
            self.capital_dest.key(),
            self.next_position_pointer.key(),
        )?;

        let transfer_amount = match order_type {
            Order::Buy => {
                let amount = target_amount * self.order_position.price;
                if self.capital_source.amount > amount {
                    amount
                } else {
                    self.capital_source.amount
                }
            }
            Order::Sell => target_amount,
            _ => 0,
        };

        transfer_checked(
            CpiContext::new(
                self.source_program.to_account_info(),
                TransferChecked {
                    from: self.capital_source.to_account_info(),
                    to: self.source.to_account_info(),
                    authority: self.signer.to_account_info(),
                    mint: self.token_mint_source.to_account_info(),
                },
            ),
            transfer_amount,
            self.token_mint_source.decimals,
        )?;

        let Clock {
            slot,
            unix_timestamp,
            ..
        } = Clock::get()?;

        emit!(MarketOrderTriggerEvent {
            market_pointer: self.market_pointer.key(),
            book_config: self.order_book_config.key(),
            capital_source: self.capital_source.key(),
            capital_dest: self.capital_dest.key(),
            source: self.source.key(),
            dest: self.dest.key(),
            pointer: self.market_pointer.order_position_pointer,
            order_type: self.market_pointer.order_type.clone(),
            is_available: self.market_pointer.market_order.is_none(),
            slot: slot,
            timestamp: unix_timestamp,
        });

        Ok(())
    }
}
