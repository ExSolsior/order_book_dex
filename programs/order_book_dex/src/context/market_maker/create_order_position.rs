use crate::constants::ORDER_POSITION_SEED;
use crate::errors::ErrorCode;
use crate::events::CreateOrderPositionEvent;
use crate::state::{Order, OrderBookConfig, OrderPosition, OrderPositionConfig};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{transfer_checked, Mint, TokenAccount, TransferChecked};

#[derive(Accounts)]
#[instruction(order_type: Order)]
pub struct CreateOrderPosition<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    pub order_book_config: Box<Account<'info, OrderBookConfig>>,

    #[account(
        mut,
        constraint = order_position_config.is_valid_order_book_config(order_book_config.key())
            @ ErrorCode::InvalidOrderBookConfig,
        constraint = order_position_config.is_valid_owner(signer.key())
            @ ErrorCode::InvalidOrderPositionOwner,
    )]
    pub order_position_config: Box<Account<'info, OrderPositionConfig>>,

    #[account(
        init,
        payer = signer,
        space = OrderPosition::LEN,
        seeds = [
            order_position_config.nonce.to_le_bytes().as_ref(),
            order_position_config.key().as_ref(),
            signer.key().as_ref(),
            ORDER_POSITION_SEED.as_bytes(),
        ],
        bump,
    )]
    pub order_position: Account<'info, OrderPosition>,

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
        mut,
        constraint = capital_source.mint == source.mint
            @ ErrorCode::InvalidMint,
    )]
    pub capital_source: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        constraint = order_book_config.is_valid_token_mint_source(source.mint, order_type.clone())
            @ ErrorCode::InvalidSource,
    )]
    pub source: InterfaceAccount<'info, TokenAccount>,

    #[account(
        constraint = order_book_config.is_valid_token_mint_dest(destination.mint, order_type.clone())
            @ ErrorCode::InvalidDestination,
    )]
    pub destination: InterfaceAccount<'info, TokenAccount>,

    #[account(
        constraint = order_book_config.token_program_a == token_program_a.key()
            @ ErrorCode::InvalidTokenProgram,
    )]
    /// CHECK: only need the pubkey to sync with token_mint_a
    pub token_program_a: UncheckedAccount<'info>,

    #[account(
        constraint = order_book_config.token_program_b == token_program_b.key()
            @ ErrorCode::InvalidTokenProgram,
    )]
    /// CHECK: only need the pubkey to sync with token_mint_b
    pub token_program_b: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

// !is_reverse -> token_mint_a is bid side, token_mint_b is ask side
//  is_reverse -> token_mint_b is bid side, token_mint_a is ask side
// NOTE:    potential problem, with vault accounts, could cause write fail issue
//          if both buy and sell are writing to the same vaults, so might have to
//          reconsider maying seperate vault accounts for both sides. if this becomes
//          an issue then we'll make that change.
impl<'info> CreateOrderPosition<'info> {
    pub fn exec(&mut self, order_type: Order, price: u64, amount: u64) -> Result<()> {
        let (balance, transfer_amount, shift) = match order_type {
            Order::Ask => (0, amount, 0),
            Order::Bid => {
                let decimals = if !self.order_book_config.is_reverse {
                    self.token_mint_b.decimals as u32
                } else {
                    self.token_mint_a.decimals as u32
                };
                let shift = u64::pow(10, decimals) as u128;
                let total = price as u128 * amount as u128;
                let total = if total % shift != 0 {
                    (total / shift) + 1
                } else {
                    total / shift
                } as u64;

                (total, total, shift)
            }
            // should throw error
            _ => unimplemented!(),
        };

        require!(
            price as u128 * amount as u128 > shift as u128,
            ErrorCode::TransferOfBidIsZero
        );

        let source_mint = self.source.mint;

        let (token_program, token_mint) = if source_mint == self.token_mint_a.key() {
            (self.token_program_a.clone(), self.token_mint_a.clone())
        } else {
            (self.token_program_b.clone(), self.token_mint_b.clone())
        };

        self.order_position_config.inc_nonce();

        self.order_position.init(
            self.order_book_config.key(),
            self.order_position_config.key(),
            self.source.key(),
            self.destination.key(),
            order_type,
            price,
            amount,
            balance,
        )?;

        transfer_checked(
            CpiContext::new(
                token_program.to_account_info(),
                TransferChecked {
                    from: self.capital_source.to_account_info(),
                    to: self.source.to_account_info(),
                    authority: self.signer.to_account_info(),
                    mint: token_mint.to_account_info(),
                },
            ),
            transfer_amount,
            token_mint.decimals,
        )?;

        self.capital_source.reload()?;

        emit!(CreateOrderPositionEvent {
            market_maker: self.signer.key(),
            pos_pubkey: self.order_position.key(),
            book_config: self.order_book_config.key(),
            pos_config: self.order_position_config.key(),
            order_type: self.order_position.order_type.clone(),
            next_nonce: self.order_position_config.nonce,
            capital_source_balance: self.capital_source.amount,
            capital_source_mint: self.capital_source.mint,
        });

        Ok(())
    }
}
