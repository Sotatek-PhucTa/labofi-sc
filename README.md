# Overview
This repository contains code about on-chain part of Labofi ecosystem. This repository is built by [Anchor](https://www.anchor-lang.com/https://www.anchor-lang.com/) - a battle-tested framework for Solana blockchain.

This repository contains code, deployed address, as well as unit tests for multiple programs.

Program lists:
- <b>labobfi-solana-smart-contract</b>: A contract allow the admin address can mint an NFT once a day for a specific address

# Labofi-solana-smart-contract
- First, we need to create the .env file
```bash
cp env.example .env
```
Then we fill the SECRET_KEY fields in `.env` file, with base58 encoded private key
## To compile programs
```bash
anchor build
```
## To deploy programs
```bash
anchor deploy -p labofi-solana-smart-contract
```
## To test programs
```
anchor test labofi-solana-smart-contract  
```
## To request Airdrop SOL
To interact with Labofi program, we need to have SOL in our wallet. There are multiple ways to do that. You can do the following. Run:
```bash
yarn ts-node scripts/0_prepare.ts
```
This scripts will request 5 SOL if the current balance of the account is lesser than 10 SOL.
## To mint NFT
To Mint a new NFT for an specific account. First, we need to deploy the Program, and have SOL in our wallet. Then, run:
```bash
yarn ts-node scripts/1_mint_nft.ts
```