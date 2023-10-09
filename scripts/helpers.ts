import * as anchor from "@coral-xyz/anchor";
import { web3 } from "@coral-xyz/anchor";
import bs58 from "bs58";
import dotenv from "dotenv";
dotenv.config();
import { LabofiSolanaSmartContract } from "../target/types/labofi_solana_smart_contract";

export async function getWalletSuite(network: "devnet" | "mainnet") {
    const secretKey = process.env.SECRET_KEY || "";
    const keyPair = web3.Keypair.fromSecretKey(bs58.decode(secretKey));
    const wallet = new anchor.Wallet(keyPair);
    let url = "";
    if (network === "devnet") {
        url = process.env.DEVNET_URL || "https://api.devnet.solana.com";
    } else if (network === "mainnet") {
        url = process.env.MAINNET_URL || "https://api.mainnet.solana.com";
    }
    const connection = new web3.Connection(url);
    const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(keyPair), {commitment: "confirmed"});
    return { provider, wallet };
}

export function getLabofiProgram(provider: anchor.Provider) {
    anchor.setProvider(provider);
    return anchor.workspace.LabofiSolanaSmartContract as anchor.Program<LabofiSolanaSmartContract>;
}