# Overview
These docs contain the design of Labofi API that interact with the Labofi Smart Contract ecosystem. The API will receive the request from the client, then build the valid transactions to submit them to the Solana blockchain.

## API Design for [Minting a new Labofi Profile NFT](https://hinodelabo.backlog.com/view/LABOFI_SOLANA-16)
We use https request: `POST /api/v1/solana/mint/nft/rank/{endUserID}`, with following request body:
```json
{
  "number_of_sent_contributions" : 1,
  "number_of_given_contributions" : 2,
  "number_of_comments" : 3,
  "to_public_key": "Base58 Public key of receiver account",
  "from_private_key": "Base58 Private key of Admin account"
}
```