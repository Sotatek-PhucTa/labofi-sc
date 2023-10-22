import * as anchor from "@coral-xyz/anchor";
import {getLabofiProgram, getWalletSuite} from "./helpers";

(async () => {
    const { wallet, program} = await getWalletSuite("devnet", false);

    const globalState = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("global")],
        program.programId,
    )[0];

    try {
        const tx = await program.methods.initContract()
            .accounts({
                globalState,
                admin: wallet.publicKey,
            }).rpc();
        console.log("Transaction success with tx: ", tx);
    } catch (err) {
        console.error(err);
        throw err;
    }
})()