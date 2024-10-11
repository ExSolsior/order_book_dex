// use crate::errors::ErrorCode;
use crate::{
    constants::{ASK_SEED, BID_SEED, MARKET_POINTER_SEED},
    state::{MarketPointer, Order, OrderBookConfig, OrderPosition},
};
use anchor_lang::{
    prelude::*,
    solana_program::{instruction::Instruction, program::invoke_signed},
};

// -> need to consider making another open order position, for market pointer, so
// this instruction can just focus only on order position so that market pointer
// is not a writer and is more optimal. reducing the risk of failed transactions
// or I can find some way to make market_pointer dynamic writter in anchor?
// OpenOrderPositionMain, OpenOrderPositionSection
// -> we are going to do something interesting, a direct reentry call
// and esculate market_pointer as writter.
#[derive(Accounts)]
pub struct OpenOrderPosition<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        constraint = market_pointer.is_valid_order_book_config(order_book_config.key()),
        constraint = order_position.is_valid_order_book_config(order_book_config.key()),
        constraint = OrderBookConfig::is_valid_config_with_order_position(order_book_config.key(), prev_order_position.as_ref()),
        constraint = OrderBookConfig::is_valid_config_with_order_position(order_book_config.key(), next_order_position.as_ref()),
    )]
    pub order_book_config: Account<'info, OrderBookConfig>,

    #[account(
        mut,
        // constraint = market_pointer.is_valid_availability(),
        constraint = market_pointer.is_valid_order_type_match(prev_order_position.as_ref()),
        constraint = market_pointer.is_valid_order_type_match(next_order_position.as_ref()),
        constraint = market_pointer.is_valid_position(prev_order_position.as_ref(), next_order_position.as_ref()),
        constraint = market_pointer.is_valid_prev_order_position(prev_order_position.as_ref()),
        constraint = market_pointer.is_valid_open_position_section(&order_position, next_position_pointer.as_ref()),
    )]
    pub market_pointer: Account<'info, MarketPointer>,

    #[account(
        mut,
        constraint = order_position.is_valid_order_type_match(&market_pointer),
        constraint = order_position.is_avialable,
    )]
    pub order_position: Account<'info, OrderPosition>,

    #[account(mut)]
    pub prev_order_position: Option<Account<'info, OrderPosition>>,

    #[account(mut)]
    pub next_order_position: Option<Account<'info, OrderPosition>>,

    pub next_position_pointer: Option<Account<'info, OrderPosition>>,
}

impl<'info> OpenOrderPosition<'info> {
    pub fn exec(&mut self) -> Result<()> {
        if let Some(prev_order_position) = self.prev_order_position.as_mut() {
            prev_order_position.next_order_position = Some(self.order_position.key());
        } else {
            self.update_order_position_pointer()?;
        };

        if let Some(next_order_position) = self.next_order_position.as_mut() {
            self.order_position.next_order_position = Some(next_order_position.key());
        } else {
            self.order_position.next_order_position = None;
        };

        Ok(())
    }

    pub fn update_order_position_pointer(&self) -> Result<()> {
        let mut accounts = Vec::with_capacity(4);
        accounts.push(AccountMeta::new(self.market_pointer.key(), true));
        accounts.push(AccountMeta::new_readonly(self.order_position.key(), false));

        let data =
            OpenOrderPosition::get_hash("instructions", "openOrderPositionReentrance").to_vec();

        let instruction = Instruction {
            program_id: crate::ID,
            accounts,
            data,
        };

        let account_infos = &[
            self.market_pointer.to_account_info().clone(),
            self.order_position.to_account_info().clone(),
        ];

        let order_seed = match self.market_pointer.order_type {
            // should fix?
            Order::Buy => BID_SEED,
            Order::Sell => ASK_SEED,

            Order::Bid => BID_SEED,
            Order::Ask => ASK_SEED,
        };

        let order_book_config_pubkey = self.order_book_config.key();

        let bump = Pubkey::find_program_address(
            &[
                order_seed.as_bytes(),
                order_book_config_pubkey.as_ref(),
                MARKET_POINTER_SEED.as_bytes(),
            ],
            &crate::ID,
        )
        .1;

        let bump_seed = &[bump];

        let signers_seeds = &[&[
            order_seed.as_bytes(),
            order_book_config_pubkey.as_ref(),
            MARKET_POINTER_SEED.as_bytes(),
            bump_seed,
        ][..]];

        invoke_signed(&instruction, account_infos, signers_seeds)?;
        Ok(())
    }

    pub fn get_hash(namespace: &str, name: &str) -> [u8; 8] {
        let preimage = format!("{}:{}", namespace, name);
        let mut sighash = [0u8; 8];

        sighash.copy_from_slice(
            &anchor_lang::solana_program::hash::hash(preimage.as_bytes()).to_bytes()[..8],
        );

        return sighash;
    }
}
