use crate::{
    constants::ORDER_BOOK_CONFIG_SEED,
    errors::ErrorCode,
    events::CloseLimitOrderEvent,
    state::{Order, OrderBookConfig, OrderPosition, OrderPositionConfig},
};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{transfer_checked, Mint, TokenAccount, TransferChecked};

#[derive(Accounts)]
pub struct CloseOrderPosition<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut,
        constraint = order_position_config.owner == owner.key(),
    )]
    /// CHECK: validate owner of order position, so the owner receives the lamports
    pub owner: UncheckedAccount<'info>,

    /// CHECK: This account is not mutated. It's only used for constraint validation.
    pub order_book_config: Account<'info, OrderBookConfig>,

    #[account(
        mut,
        constraint = order_position.is_valid_order_book_config(order_book_config.key())
            @ ErrorCode::InvalidOrderPosition,
        constraint = !order_position.is_available
            @ ErrorCode::InvalidAvailableStatus,
        constraint = order_position.order_position_config == order_position_config.key()
            @ ErrorCode::InvalidOrderPosition,
        close = owner
    )]
    pub order_position: Account<'info, OrderPosition>,

    #[account(
        mut,
        constraint = order_position_config.is_valid_order_book_config(order_book_config.key())
            @ ErrorCode::InvalidOrderPositionConfig,
        constraint = order_position_config.is_valid_owner(owner.key())
            @ ErrorCode::InvalidOrderPositionOwner,
    )]
    pub order_position_config: Account<'info, OrderPositionConfig>,

    #[account(
        mut,
        constraint = order_position.source == source.key(),
        constraint = token_mint_source.key() == source.mint,
    )]
    pub source: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        constraint = order_position.destination == dest.key(),
        constraint = token_mint_dest.key() == dest.mint,
    )]
    pub dest: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        constraint = capital_source.key() != capital_dest.key(),
        constraint = order_position_config.capital_a == capital_source.key() || order_position_config.capital_b == capital_source.key(),
    )]
    pub capital_source: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        constraint = order_position_config.capital_a == capital_dest.key() || order_position_config.capital_b == capital_dest.key(),
    )]
    pub capital_dest: InterfaceAccount<'info, TokenAccount>,

    pub token_mint_source: InterfaceAccount<'info, Mint>,
    pub token_mint_dest: InterfaceAccount<'info, Mint>,

    /// CHECKED: validate owner of token mint source
    pub source_program: UncheckedAccount<'info>,

    /// CHECKED: validate owner of token mint source
    pub dest_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> CloseOrderPosition<'info> {
    pub fn exec(&mut self) -> Result<()> {
        // The account will be automatically closed and its lamports
        // will be transferred to the signer due to the `close = signer` constraint

        // order position open reference
        self.order_position_config.close_position();

        let bump = &[self.order_book_config.bump];
        let signer_seeds = &[&[
            self.order_book_config.token_mint_a.as_ref(),
            self.order_book_config.token_mint_b.as_ref(),
            ORDER_BOOK_CONFIG_SEED.as_bytes(),
            bump,
        ][..]];

        let balance = self.order_position.balance;
        let amount = self.order_position.size - self.order_position.fill;

        // works for both sell and buy
        // if remaining balance and open reference is 0 then transfer remaining balance
        if self.source.amount != 0 && self.order_position_config.reference == 0 {
            transfer_checked(
                CpiContext::new_with_signer(
                    self.source_program.to_account_info(),
                    TransferChecked {
                        from: self.source.to_account_info(),
                        to: self.capital_source.to_account_info(),
                        authority: self.order_book_config.to_account_info(),
                        mint: self.token_mint_source.to_account_info(),
                    },
                    signer_seeds,
                ),
                self.source.amount,
                self.token_mint_source.decimals,
            )?;
        }

        // works for both sell and buy
        // if remaining balance and open reference is 0 then transfer remaining balance
        if self.dest.amount != 0 && self.order_position_config.reference == 0 {
            transfer_checked(
                CpiContext::new_with_signer(
                    self.dest_program.to_account_info(),
                    TransferChecked {
                        from: self.dest.to_account_info(),
                        to: self.capital_dest.to_account_info(),
                        authority: self.order_book_config.to_account_info(),
                        mint: self.token_mint_dest.to_account_info(),
                    },
                    signer_seeds,
                ),
                self.dest.amount,
                self.token_mint_dest.decimals,
            )?;
        }

        if self.order_position.order_type == Order::Ask
            && amount != 0
            && self.order_position_config.reference != 0
        {
            transfer_checked(
                CpiContext::new_with_signer(
                    self.source_program.to_account_info(),
                    TransferChecked {
                        from: self.source.to_account_info(),
                        to: self.capital_source.to_account_info(),
                        authority: self.order_book_config.to_account_info(),
                        mint: self.token_mint_source.to_account_info(),
                    },
                    signer_seeds,
                ),
                amount,
                self.token_mint_source.decimals,
            )?;
        }

        if self.order_position.order_type == Order::Ask
            && balance != 0
            && self.order_position_config.reference != 0
        {
            transfer_checked(
                CpiContext::new_with_signer(
                    self.dest_program.to_account_info(),
                    TransferChecked {
                        from: self.dest.to_account_info(),
                        to: self.capital_dest.to_account_info(),
                        authority: self.order_book_config.to_account_info(),
                        mint: self.token_mint_dest.to_account_info(),
                    },
                    signer_seeds,
                ),
                balance,
                self.token_mint_dest.decimals,
            )?;
        }

        if self.order_position.order_type == Order::Bid
            && balance != 0
            && self.order_position_config.reference != 0
        {
            transfer_checked(
                CpiContext::new_with_signer(
                    self.source_program.to_account_info(),
                    TransferChecked {
                        from: self.source.to_account_info(),
                        to: self.capital_source.to_account_info(),
                        authority: self.order_book_config.to_account_info(),
                        mint: self.token_mint_source.to_account_info(),
                    },
                    signer_seeds,
                ),
                balance,
                self.token_mint_source.decimals,
            )?;
        }

        if self.order_position.order_type == Order::Bid
            && self.order_position.fill != 0
            && self.order_position_config.reference != 0
        {
            transfer_checked(
                CpiContext::new_with_signer(
                    self.dest_program.to_account_info(),
                    TransferChecked {
                        from: self.dest.to_account_info(),
                        to: self.capital_dest.to_account_info(),
                        authority: self.order_book_config.to_account_info(),
                        mint: self.token_mint_dest.to_account_info(),
                    },
                    signer_seeds,
                ),
                self.order_position.fill,
                self.token_mint_dest.decimals,
            )?;
        }

        self.capital_source.reload()?;
        self.capital_dest.reload()?;

        emit!(CloseLimitOrderEvent {
            market_maker: self.owner.key(),
            pos_pubkey: self.order_position.key(),
            book_config: self.order_book_config.key(),
            pos_config: self.order_position_config.key(),
            capital_source_balance: self.capital_source.amount,
            capital_source_mint: self.capital_source.mint,
            capital_dest_balance: self.capital_dest.amount,
            capital_dest_mint: self.capital_dest.mint,
        });

        Ok(())
    }
}
