use anchor_lang::{prelude::*, system_program};
use anchor_spl::{associated_token, token};
use mpl_token_metadata::{instructions as token_instructions, types::DataV2};

declare_id!("mKajGfPPTPZY2L3ofCDYND6Bk9NDFQz6mmGjfKWP8rj");

#[program]
pub mod labofi_solana_smart_contract {
    use super::*;

    pub fn init_contract(
        ctx: Context<InitContract>,
    ) -> Result<()> {
        msg!("Initializing contract...");
        let global_storage = &mut ctx.accounts.global_state;
        global_storage.admin = *ctx.accounts.admin.key;
        global_storage.mint_time = Clock::get()?.unix_timestamp as u64;
        msg!("Init contract success");
        Ok(())
    }

    pub fn init_nft_account(
        ctx: Context<InitNftAccount>,
    ) -> Result<()> {
        msg!("Creating mint account...");
        msg!("Mint: {}", &ctx.accounts.mint.key());
        require!(ctx.accounts.mint_authority.key() == ctx.accounts.global_state.admin, LabofiError::NotAuthorized);
        system_program::create_account(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                system_program::CreateAccount {
                    from: ctx.accounts.mint_authority.to_account_info(),
                    to: ctx.accounts.mint.to_account_info(),
                },
            ),
            10000000,
            82,
            &ctx.accounts.token_program.key(),
        )
        .expect("Failed to create mint account");

        msg!("Initializing mint account...");
        msg!("Mint: {}", &ctx.accounts.mint.key());
        token::initialize_mint(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::InitializeMint {
                    mint: ctx.accounts.mint.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
            ),
            0,
            &ctx.accounts.mint_authority.key(),
            Some(&ctx.accounts.mint_authority.key()),
        )
        .expect("Failed to initialize mint account");

        msg!("Creating token account...");
        msg!("Token Address: {}", &ctx.accounts.token_account.key());
        associated_token::create(CpiContext::new(
            ctx.accounts.associated_token_program.to_account_info(),
            associated_token::Create {
                payer: ctx.accounts.mint_authority.to_account_info(),
                associated_token: ctx.accounts.token_account.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                authority: ctx.accounts.token_account_authority.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                token_program: ctx.accounts.token_program.to_account_info(),
            },
        ))
        .expect("Failed to create token account");

        msg!("Minting token to token account...");
        msg!("Mint: {}", &ctx.accounts.mint.to_account_info().key());
        msg!("Token address: {}", &ctx.accounts.token_account.key());
        token::mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.token_account.to_account_info(),
                    authority: ctx.accounts.mint_authority.to_account_info(),
                },
            ),
            1,
        )
        .expect("Failed to mint token");

        Ok(())
    }

    pub fn mint(
        ctx: Context<MintNft>,
        metadata_title: String,
        metadata_symbol: String,
        metadata_uri: String,
    ) -> Result<()> {
        let token_metadata_program_account = ctx.accounts.token_metadata_program.to_account_info();
        let mint_account = ctx.accounts.mint.to_account_info();
        let mint_authority_account = ctx.accounts.mint_authority.to_account_info();
        let system_program_account = ctx.accounts.system_program.to_account_info();
        let rent_program_account = ctx.accounts.rent.to_account_info();
        let master_edition_account = ctx.accounts.master_edition.to_account_info();
        let metadata_account = ctx.accounts.metadata.to_account_info();
        let token_program_account = ctx.accounts.token_program.to_account_info();

        msg!("Creating metadata account...");
        msg!(
            "Metadata account address: {}",
            &ctx.accounts.metadata.to_account_info().key()
        );


        let mut create_metadata_account_cpi =
            token_instructions::CreateMetadataAccountV3CpiBuilder::new(
                &token_metadata_program_account,
            );
        create_metadata_account_cpi.mint(&mint_account);
        create_metadata_account_cpi.mint_authority(&mint_authority_account);
        create_metadata_account_cpi.payer(&mint_authority_account);
        create_metadata_account_cpi.update_authority(&mint_authority_account);
        create_metadata_account_cpi.system_program(&system_program_account);
        create_metadata_account_cpi.rent(Some(&rent_program_account));
        create_metadata_account_cpi.is_mutable(true);
        create_metadata_account_cpi.metadata(&metadata_account);
        create_metadata_account_cpi.data(DataV2 {
            name: metadata_title,
            symbol: metadata_symbol,
            uri: metadata_uri,
            seller_fee_basis_points: 0,
            creators: None,
            collection: None,
            uses: None,
        });

        create_metadata_account_cpi
            .invoke()
            .expect("Failed to create metadata account");

        msg!("Creating metadata account success");

        msg!("Creating master edition metadata account ");
        msg!(
            "Master edition metadata account address: {}",
            &ctx.accounts.master_edition.to_account_info().key()
        );

        let mut create_master_edition_cpi =
            token_instructions::CreateMasterEditionV3CpiBuilder::new(
                &token_metadata_program_account,
            );
        create_master_edition_cpi.edition(&master_edition_account);
        create_master_edition_cpi.mint(&mint_account);
        create_master_edition_cpi.update_authority(&mint_authority_account);
        create_master_edition_cpi.mint_authority(&mint_authority_account);
        create_master_edition_cpi.payer(&mint_authority_account);
        create_master_edition_cpi.metadata(&metadata_account);
        create_master_edition_cpi.token_program(&token_program_account);
        create_master_edition_cpi.system_program(&system_program_account);

        create_master_edition_cpi
            .invoke()
            .expect("Failed to create master edition metadata account");

        msg!("Mint token success");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct MintNft<'info> {
    /// CHECK: We're about to create this with metaplex
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,
    /// CHECK: We're about to create this with metaplex
    #[account(mut)]
    pub master_edition: UncheckedAccount<'info>,
    #[account(mut)]
    pub mint: Signer<'info>,
    #[account(mut)]
    pub mint_authority: Signer<'info>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, token::Token>,
    /// CHECK: Metaplex will check this
    pub token_metadata_program: UncheckedAccount<'info>,
}


#[derive(Accounts)]
pub struct InitNftAccount<'info> {
    #[account(mut)]
    pub mint: Signer<'info>,
    /// CHECK: We're about to create this with Anchor
    #[account(mut)]
    pub token_account: UncheckedAccount<'info>,
    /// CHECK: We're about to create this with Anchor
    #[account()]
    pub token_account_authority: UncheckedAccount<'info>,
    #[account(mut)]
    pub mint_authority: Signer<'info>,
    #[account()]
    pub global_state: Account<'info, GlobalState>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, token::Token>,
    pub associated_token_program: Program<'info, associated_token::AssociatedToken>,
}

#[derive(Accounts)]
pub struct InitContract<'info> {
    #[account(
        init,
        seeds = [b"global"],
        bump,
        payer = admin,
        space = 8 + 32 + 8,
    )]
    pub global_state: Account<'info, GlobalState>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct GlobalState {
    pub admin: Pubkey,
    pub mint_time: u64,
}

#[error_code]
enum LabofiError {
    #[msg("Only Admin can mint")]
    NotAuthorized,
}