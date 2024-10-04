use anchor_lang::prelude::*;

declare_id!("Ho5fe2xYQX84C5kXTSB34hZCudUB4Z1KDhFViPFtGoP");

#[program]
pub mod order_book_dex {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
