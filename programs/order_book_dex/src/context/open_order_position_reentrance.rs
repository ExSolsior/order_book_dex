// use crate::errors::ErrorCode;
use crate::state::{MarketPointer, OrderPosition};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct OpenOrderPositionReentrance<'info> {
    #[account(mut, signer)]
    pub market_pointer: Account<'info, MarketPointer>,

    #[account(mut)]
    pub order_position: Account<'info, OrderPosition>,
}

// since this is going to a cpi... maybe I need to check
// that market_pointer is not executing since it could change
impl<'info> OpenOrderPositionReentrance<'info> {
    pub fn exec(&mut self) -> Result<()> {
        self.market_pointer.order_position_pointer = Some(self.order_position.key());

        Ok(())
    }
}
