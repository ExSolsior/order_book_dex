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
    pub market_pointer: Box<Account<'info, MarketPointer>>,

    // may no longer need this since I am removing the calculation for simplicity
    #[account(
        constraint = market_pointer.order_position_pointer.unwrap() == order_position.key()
            @ ErrorCode::InvalidFillOrderPosition,
        // constraint = next_position_pointer.is_some() || 
        //     (next_position_pointer.is_none() 
        //     && order_position.next_order_position.is_none())
        //     @ ErrorCode::InvalidNextPointer,
    )]
    pub order_position: Box<Account<'info, OrderPosition>>,

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
        associated_token::authority = signer,
        associated_token::mint = token_mint_source,
    )]
    pub capital_source: InterfaceAccount<'info, TokenAccount>,

    #[account(
        associated_token::authority = signer,
        associated_token::mint = token_mint_dest,
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
    pub token_mint_dest: InterfaceAccount<'info, Mint>,

    /// CHECKED: validate owner of token mint source
    pub source_program: UncheckedAccount<'info>,

    #[account(
        constraint = next_position_pointer.is_valid_order_book_config(order_book_config.key())
            @ ErrorCode::InvalidOrderPosition,
        constraint = next_position_pointer.is_valid_order_type_match(&market_pointer)
            @ ErrorCode::InvalidOrderType,
    )]
    pub next_position_pointer: Option<Account<'info, OrderPosition>>,
}

impl<'info> CreateMarketOrder<'info> {
    // I don't think I need the order_type since it already exist on the market pointer
    pub fn exec(&mut self, order_type: Order, fill: Fill, target_amount: u64) -> Result<()> {
        let transfer_amount = match self.market_pointer.order_type {
            // FORMULA
            // price * amount / 10 ** amount_decimal
            // NOTE
            // This doesn't accuretly calculate the total transfer amount to reach target amount if there is more than
            // one order position that must be matched. so it takes the larget value either
            // computed amount of the first position to matched agaisnt or the taker capital source amount
            // if the computed amount is the largets it is most likely going to only match against one order position
            // ... the simplist way to do this is just use all of the capital source amount and avoid this computation
            // any remaining amount left in the source vault will be transfered back anyway.
            // should be something like this
            // self.capital_source.amount
            // let decimals = self.token_mint_dest.decimals as u32;
            // let amount = (self.order_position.price as u128 * target_amount as u128 / u64::pow(10, decimals) as u128) as u64;
            // if self.capital_source.amount >= amount && amount != 0 {self.capital_source.amount} else {amount}
            Order::Buy => self.capital_source.amount,

            // should be something like this
            // if self.capital_source.amount > target_amount {target_amount} else {self.capital_source.amount}
            Order::Sell => {
                if self.capital_source.amount > target_amount {
                    target_amount
                } else {
                    self.capital_source.amount
                }
            }
            _ => unreachable!(),
        };

        require!(transfer_amount != 0, ErrorCode::InvalidTransferAmount);

        self.market_pointer.add_market_order(
            order_type.clone(),
            fill,
            target_amount,
            transfer_amount,
            self.signer.key(),
            self.source.key(),
            self.dest.key(),
            self.capital_source.key(),
            self.capital_dest.key(),
            self.next_position_pointer
                .is_some()
                .then(|| self.next_position_pointer.as_ref().unwrap().key()),
        )?;

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
            // capital token account
            capital_source: self.capital_source.key(),
            capital_dest: self.capital_dest.key(),
            // vault token account
            source: self.source.key(),
            dest: self.dest.key(),
            // matched order position
            pointer: self.market_pointer.order_position_pointer,
            order_type: self.market_pointer.order_type.clone(),
            is_available: self.market_pointer.market_order.is_none(),
            slot: slot,
            timestamp: unix_timestamp,
            // capital source balance
            // capital source mint
            // capital destination balance
            // capital destination mint
        });

        Ok(())
    }
}
