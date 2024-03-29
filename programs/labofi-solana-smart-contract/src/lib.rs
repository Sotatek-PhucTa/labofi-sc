use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount};
use anchor_spl::{associated_token, token};
use mpl_token_metadata::{instructions as token_instructions, types::DataV2};

declare_id!("ANYpUxvMWd5pBwGDf4cTejCYCJTP5ecrSof968gcFGBT");

#[program]
pub mod labofi_solana_smart_contract {
    use super::*;

    pub fn init_contract(ctx: Context<InitContract>) -> Result<()> {
        msg!("Initializing contract...");
        let global_storage = &mut ctx.accounts.global_state;
        global_storage.admin = *ctx.accounts.admin.key;
        global_storage.mint_time = Clock::get()?.unix_timestamp as u64;
        msg!("Init contract success");
        Ok(())
    }

    pub fn init_tracking_state(ctx: Context<InitTrackingState>) -> Result<()> {
        msg!("Initializing tracking state...");
        let tracking_state = &mut ctx.accounts.tracking_state;
        tracking_state.counted_rank[ProfileRank::White.to_usize()] += 1;
        tracking_state.current_rank = ProfileRank::White;
        Ok(())
    }

    pub fn init_nft_account(
        ctx: Context<InitNftAccount>,
        profile_rank: ProfileRank,
        sent_contributions: u32,
        given_contributions: u32,
        comments: u32,
    ) -> Result<()> {
        msg!("Mint: {}", &ctx.accounts.mint.key());
        require!(
            ctx.accounts.mint_authority.key() == ctx.accounts.global_state.admin,
            LabofiError::NotAuthorized
        );

        require!(
            ProfileRank::evaluate_rank(sent_contributions, given_contributions, comments) == profile_rank,
            LabofiError::RankInCorrect,
        );

        msg!("Minting token to token account...");
        msg!("Mint: {}", &ctx.accounts.mint.to_account_info().key());
        msg!("Token address: {}", &ctx.accounts.token_account.key());
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.token_account.to_account_info(),
                    authority: ctx.accounts.mint.to_account_info(),
                },
                &[&[
                    "bronze".as_bytes(),
                    ctx.accounts.token_account_authority.key().as_ref(),
                    &[*ctx.bumps.get("mint").unwrap()],
                ]],
            ),
            1,
        )
        .expect("Failed to mint token");

        Ok(())
    }

    pub fn mint(
        ctx: Context<MintNft>,
        profile_rank: ProfileRank,
        metadata_title: String,
        metadata_symbol: String,
        metadata_uri: String,
    ) -> Result<()> {
        let token_metadata_program_account = ctx.accounts.token_metadata_program.to_account_info();
        let mint_account = ctx.accounts.mint.to_account_info();
        let mint_authority_account = ctx.accounts.mint_authority.to_account_info();
        let token_account_authority = ctx.accounts.token_account_authority.to_account_info();
        let system_program_account = ctx.accounts.system_program.to_account_info();
        let rent_program_account = ctx.accounts.rent.to_account_info();
        let master_edition_account = ctx.accounts.master_edition.to_account_info();
        let metadata_account = ctx.accounts.metadata.to_account_info();
        let token_program_account = ctx.accounts.token_program.to_account_info();
        let tracking_state_account = &mut ctx.accounts.tracking_state;

        msg!("Creating metadata account...");
        msg!(
            "Metadata account address: {}",
            &ctx.accounts.metadata.to_account_info().key()
        );

        tracking_state_account.counted_rank[profile_rank.to_usize()] += 1;
        tracking_state_account.current_rank = profile_rank;

        let mut create_metadata_account_cpi =
            token_instructions::CreateMetadataAccountV3CpiBuilder::new(
                &token_metadata_program_account,
            );
        create_metadata_account_cpi.mint(&mint_account);
        create_metadata_account_cpi.mint_authority(&mint_account);
        create_metadata_account_cpi.payer(&mint_authority_account);
        create_metadata_account_cpi.update_authority(&mint_account);
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
            .invoke_signed(&[&[
                "bronze".as_bytes(),
                token_account_authority.key().as_ref(),
                &[*ctx.bumps.get("mint").unwrap()],
            ]])
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
        create_master_edition_cpi.update_authority(&mint_account);
        create_master_edition_cpi.mint_authority(&mint_account);
        create_master_edition_cpi.payer(&mint_authority_account);
        create_master_edition_cpi.metadata(&metadata_account);
        create_master_edition_cpi.token_program(&token_program_account);
        create_master_edition_cpi.system_program(&system_program_account);

        create_master_edition_cpi
            .invoke_signed(&[&[
                "bronze".as_bytes(),
                token_account_authority.key().as_ref(),
                &[*ctx.bumps.get("mint").unwrap()],
            ]])
            .expect("Failed to create master edition metadata account");

        msg!("Mint token success");
        Ok(())
    }

    pub fn close_global_state(_ctx: Context<CloseGlobalState>) -> Result<()> {
        require!(
            cfg!(feature = "dev-testing"),
            LabofiError::NotProductionInstruction
        );
        msg!("Closing global state...");
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(profile_rank: ProfileRank)]
pub struct MintNft<'info> {
    /// CHECK: We're about to create this with metaplex
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,
    /// CHECK: We're about to create this with metaplex
    #[account(mut)]
    pub master_edition: UncheckedAccount<'info>,
    #[account(
        seeds = [profile_rank.to_string().as_bytes(), token_account_authority.key().as_ref()],
        bump,
        mut,
    )]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub mint_authority: Signer<'info>,
    /// CHECK: We're about to create this with Anchor
    #[account()]
    pub token_account_authority: UncheckedAccount<'info>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, token::Token>,
    /// CHECK: Metaplex will check this
    pub token_metadata_program: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [b"tracking", token_account_authority.key().as_ref()],
        bump,
    )]
    pub tracking_state: Account<'info, TrackingState>,
}

#[derive(Accounts)]
#[instruction(profile_rank: ProfileRank)]
pub struct InitNftAccount<'info> {
    #[account(
        init,
        payer = mint_authority,
        mint::decimals = 0,
        mint::authority = mint,
        mint::freeze_authority = mint,
        seeds = [profile_rank.to_string().as_bytes(), token_account_authority.key().as_ref()],
        bump,
    )]
    pub mint: Account<'info, Mint>,
    #[account(
        init,
        payer = mint_authority,
        associated_token::mint = mint,
        associated_token::authority = token_account_authority,
    )]
    pub token_account: Account<'info, TokenAccount>,
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

#[derive(Accounts)]
pub struct CloseGlobalState<'info> {
    #[account(
        mut,
        close = close_authorizer,
        seeds = [b"global"],
        bump,
    )]
    pub global_state: Account<'info, GlobalState>,
    #[account(
        mut,
        address = global_state.admin.key(),
    )]
    pub close_authorizer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitTrackingState<'info> {
    #[account(
        init,
        space = 8 + 32 + 8 + 4 * 5,
        payer = initializer,
        seeds = [b"tracking", user_account.key().as_ref()],
        bump,
    )]
    pub tracking_state: Account<'info, TrackingState>,
    /// CHECK: We're about to create this with metaplex
    #[account()]
    pub user_account: UncheckedAccount<'info>,
    #[account(
        mut,
        address = global_state.admin.key(),
    )]
    pub initializer: Signer<'info>,
    #[account(
        seeds = [b"global"],
        bump,
    )]
    pub global_state: Account<'info, GlobalState>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct GlobalState {
    pub admin: Pubkey,
    pub mint_time: u64,
}

#[account]
pub struct TrackingState {
    pub counted_rank: [u32; 5],
    pub current_rank: ProfileRank,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, Eq, PartialEq)]
pub enum ProfileRank {
    White,
    Gray,
    Green,
    Bronze,
    Silver,
}

impl ProfileRank {
    pub fn to_usize(&self) -> usize {
        match self {
            ProfileRank::White => 0usize,
            ProfileRank::Gray => 1usize,
            ProfileRank::Green => 2usize,
            ProfileRank::Bronze => 3usize,
            ProfileRank::Silver => 4usize,
        }
    }

    pub fn to_string(&self) -> String {
        match self {
            ProfileRank::White => "white".to_string(),
            ProfileRank::Gray => "gray".to_string(),
            ProfileRank::Green => "green".to_string(),
            ProfileRank::Bronze => "bronze".to_string(),
            ProfileRank::Silver => "silver".to_string(),
        }
    }

    pub fn evaluate_rank(sent_contributions: u32, given_contributions: u32, comments: u32) -> ProfileRank {
        if sent_contributions >= 50 && given_contributions >= 30 && comments >= 20 {
            return ProfileRank::Silver;
        }
        if sent_contributions >= 30 && given_contributions >= 10 && comments >= 5 {
            return  ProfileRank::Bronze;
        }
        if sent_contributions >= 10 && given_contributions >= 5 && comments >= 3 {
            return  ProfileRank::Green;
        }
        if sent_contributions >= 3 && given_contributions >= 3 && comments >= 1 {
            return  ProfileRank::Gray;
        }
        ProfileRank::White
    }
}

#[error_code]
enum LabofiError {
    #[msg("Only Admin can mint")]
    NotAuthorized,
    #[msg("Not Production Instruction")]
    NotProductionInstruction,
    #[msg("Rank incorrect")]
    RankInCorrect,
    #[msg("Unknown Operation")]
    UnknownOperation,
}
