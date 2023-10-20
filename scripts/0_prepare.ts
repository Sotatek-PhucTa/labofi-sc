import dotenv from "dotenv";
import { getWalletSuite } from "./helpers";
dotenv.config();

(async () => {
    const MINIMUM_BALANCE_AMOUNT = 10000000000;
    const { provider, wallet } = await getWalletSuite("devnet", false);
    console.log("Public key is ", wallet.publicKey.toBase58());
    const balance = await provider.connection.getBalance(wallet.publicKey).then((balance) => balance);
    console.log("Current balance is ", await provider.connection.getBalance(wallet.publicKey).then((balance) => balance));
    if (balance < MINIMUM_BALANCE_AMOUNT) {
        console.log("Request airdrop");
        try {
            const tx = await provider.connection.requestAirdrop(wallet.publicKey, 5000000000);
            console.log(`Airdrop done with tx ${tx}`);
        } catch (err) {
            console.error("Air drop failed", err);
        }
        console.log("New balance is ", await provider.connection.getBalance(wallet.publicKey).then((balance) => balance));
    }
})()
