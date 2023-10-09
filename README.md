# Overview
This repository contains code about on-chain part of Labofi ecosystem. This repository is built by [Anchor](https://www.anchor-lang.com/https://www.anchor-lang.com/) - a battle-tested framework for Solana blockchain.

This repository contains code, deployed address, as well as unit tests for multiple programs.

Program lists:
- <b>labobfi-solana-smart-contract</b>: A contract allow the admin address can mint an NFT once a day for a specific address

# Labofi-solana-smart-contract
## To compile
```bash
anchor build
```
## To deploy
```bash
anchor deploy -p labofi-solana-smart-contract
```
## To test
```
anchor test labofi-solana-smart-contract  
```

