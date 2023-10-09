import * as anchor from "@coral-xyz/anchor";
import { web3 } from "@coral-xyz/anchor";
import bs58 from "bs58";
import dotenv from "dotenv";
dotenv.config();

(async () => {
    const MINIMUM_BALANCE_AMOUNT = 2000000000;
    const secretKey = process.env.SECRET_KEY || "";
    const keyPair = web3.Keypair.fromSecretKey(bs58.decode(secretKey));
    const connection = new web3.Connection(process.env.DEVNET_URL || "https://api.devnet.solana.com");
    const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(keyPair), {commitment: "confirmed"});
    console.log("Public key is ", keyPair.publicKey.toBase58());
    const balance = await provider.connection.getBalance(keyPair.publicKey).then((balance) => balance);
    if (balance < MINIMUM_BALANCE_AMOUNT) {
        console.log("Request airdrop");
        console.log("Old balance is ", await provider.connection.getBalance(keyPair.publicKey).then((balance) => balance));
        const tx = await provider.connection.requestAirdrop(keyPair.publicKey, 5000000000);
        console.log(`Airdrop done with tx ${tx}`);
        console.log("New balance is ", await provider.connection.getBalance(keyPair.publicKey).then((balance) => balance));
    }
})()
