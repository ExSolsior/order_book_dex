use crate::{
    constants::ORDER_BOOK_CONFIG_SEED,
    errors::ErrorCode,
    events::MarketOrderCompleteEvent,
    state::{MarketPointer, OrderBookConfig},
};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{transfer_checked, Mint, TokenAccount, TransferChecked};

#[derive(Accounts)]
pub struct ReturnExecutionMarketOrder<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    pub order_book_config: Box<Account<'info, OrderBookConfig>>,

    #[account(
        mut,
        constraint = market_pointer.is_valid_order_book_config(order_book_config.key())
            @ ErrorCode::InvalidMarketPointer,
        constraint = market_pointer.is_valid_return(signer.key())
            @ ErrorCode::InvalidProcessReturnExecutionStatus,
    )]
    pub market_pointer: Account<'info, MarketPointer>,

    #[account(
        mut,
        constraint = market_pointer.execution_stats.as_ref().unwrap().source == source.key(),
        constraint = token_mint_source.key() == source.mint,
    )]
    pub source: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        constraint = market_pointer.execution_stats.as_ref().unwrap().dest == dest.key(),
        constraint = token_mint_dest.key() == dest.mint,

    )]
    pub dest: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        constraint = market_pointer.execution_stats.as_ref().unwrap().capital_source == capital_source.key(),
    )]
    /// CHECKED: Don't need the data, only pubkey
    pub capital_source: UncheckedAccount<'info>,

    #[account(
        mut,
        constraint = market_pointer.execution_stats.as_ref().unwrap().capital_dest == capital_dest.key(),
    )]
    /// CHECKED: Don't need the data, only pubkey
    pub capital_dest: UncheckedAccount<'info>,

    pub token_mint_source: InterfaceAccount<'info, Mint>,
    pub token_mint_dest: InterfaceAccount<'info, Mint>,

    /// CHECKED: validate owner of token mint source
    pub source_program: UncheckedAccount<'info>,

    /// CHECKED: validate owner of token mint source
    pub dest_program: UncheckedAccount<'info>,
}

impl<'info> ReturnExecutionMarketOrder<'info> {
    pub fn exec(&mut self) -> Result<()> {
        let market_data = self.market_pointer.remove_market_order()?;

        let bump = &[self.order_book_config.bump];
        let signer_seeds = &[&[
            self.order_book_config.token_mint_a.as_ref(),
            self.order_book_config.token_mint_b.as_ref(),
            ORDER_BOOK_CONFIG_SEED.as_bytes(),
            bump,
        ][..]];

        if self.source.amount != 0 {
            transfer_checked(
                CpiContext::new_with_signer(
                    self.source_program.to_account_info(),
                    TransferChecked {
                        to: self.source.to_account_info(),
                        from: self.capital_source.to_account_info(),
                        authority: self.order_book_config.to_account_info(),
                        mint: self.token_mint_source.to_account_info(),
                    },
                    signer_seeds,
                ),
                self.source.amount,
                self.token_mint_source.decimals,
            )?;
        }

        if self.dest.amount != 0 {
            transfer_checked(
                CpiContext::new_with_signer(
                    self.dest_program.to_account_info(),
                    TransferChecked {
                        to: self.dest.to_account_info(),
                        from: self.capital_dest.to_account_info(),
                        authority: self.order_book_config.to_account_info(),
                        mint: self.token_mint_dest.to_account_info(),
                    },
                    signer_seeds,
                ),
                self.dest.amount,
                self.token_mint_dest.decimals,
            )?;
        }

        let Clock {
            slot,
            unix_timestamp,
            ..
        } = Clock::get()?;

        emit!(MarketOrderCompleteEvent {
            market_pointer: self.market_pointer.key(),
            book_config: self.order_book_config.key(),
            new_pointer: self.market_pointer.order_position_pointer,
            order_type: self.market_pointer.order_type.clone(),
            total_cost: market_data.total_cost,
            total_amount: market_data.total_amount,
            last_price: market_data.last_price,
            is_available: self.market_pointer.market_order.is_none(),
            slot: slot,
            timestamp: unix_timestamp,
        });

        Ok(())
    }
}
