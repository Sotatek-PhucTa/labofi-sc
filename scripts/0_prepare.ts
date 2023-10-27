import dotenv from "dotenv";
import { delay, getDefaultWallet, getWalletSuite } from "./helpers";
import { web3 } from "@coral-xyz/anchor";
dotenv.config();

/**
 * This script will generate a fresh new Solana wallet
 * Request 5 SOL airdrop to that new address
 * Then transfer 4.7 SOL to our default address (address saved in ~/.config/solana/id.json)
 * Because our default address will be used in testing phase
 * All operations are processed in DEVNET
 */
(async () => {
  const { provider, wallet } = await getWalletSuite("devnet", true);
  const defaultWallet = getDefaultWallet();

  // Airdrop to new generated wallet
  try {
    const tx = await provider.connection.requestAirdrop(
      wallet.publicKey,
      5000000000
    );
    console.log(`Airdrop done with tx ${tx}`);
    await delay(5000);
  } catch (err) {
    console.error("Airdrop failed", err);
  }

  // Transfer from new generated wallet to default wallet
  const recentBlockhash = await provider.connection
    .getLatestBlockhash()
    .then((x) => x.blockhash);
  const transferTransaction = new web3.Transaction().add(
    web3.SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: defaultWallet.publicKey,
      lamports: 4.7 * web3.LAMPORTS_PER_SOL,
    })
  );
  transferTransaction.recentBlockhash = recentBlockhash;
  transferTransaction.feePayer = wallet.publicKey;

  const tx = await provider.wallet.signTransaction(transferTransaction);
  try {
    const res = await provider.connection.sendRawTransaction(tx.serialize());
    console.log(`Transfer success with tx ${res}`);
  } catch (err) {
    console.error(err);
  }
})();
