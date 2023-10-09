import * as anchor from "@coral-xyz/anchor";
import dotenv from "dotenv";
import { getLabofiProgram, getWalletSuite } from "./helpers";
dotenv.config();

(async () => {
    const { provider, wallet } = await getWalletSuite("devnet");
    console.log("Public key is ", wallet.publicKey.toBase58());
    const program = await getLabofiProgram(provider);
    console.log("Program is ", program.programId.toBase58());

    const receivedKeyPair = await anchor.web3.Keypair.generate();
    console.log("Received address ", receivedKeyPair.publicKey.toBase58());

    const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey(
        "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
    );



    const mintKeypair: anchor.web3.Keypair = anchor.web3.Keypair.generate();
    const tokenAddress = await anchor.utils.token.associatedAddress({
        mint: mintKeypair.publicKey,
        owner: receivedKeyPair.publicKey,
    });
    console.log(`New token: ${mintKeypair.publicKey.toBase58()}`);

    const metadataAddress = anchor.web3.PublicKey.findProgramAddressSync(
        [
            Buffer.from("metadata"),
            TOKEN_METADATA_PROGRAM_ID.toBuffer(),
            mintKeypair.publicKey.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID,
    )[0];
    console.log("Metadata initialzed");

    const masterEditionAddress = anchor.web3.PublicKey.findProgramAddressSync(
        [
            Buffer.from("metadata"),
            TOKEN_METADATA_PROGRAM_ID.toBuffer(),
            mintKeypair.publicKey.toBuffer(),
            Buffer.from("edition"),
        ],
        TOKEN_METADATA_PROGRAM_ID,
    )[0];
    console.log("Master edition metadata initialzed");

    const globalState = await anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("global"),
      ],
      program.programId,
    )[0];

    try {
        const testNftTitle = "Labofi_Profile";
        const testNftSymbol = "PROFILE";
        const testNftUri = "ipfs:://QmexKAGNCb3DqSJCkSskg5aB2fdAk1BZMH7ZQLwwZe9p98";
        const tx = await program.methods.initNftAccount(
        ).accounts({
            mint: mintKeypair.publicKey,
            tokenAccount: tokenAddress,
            tokenAccountAuthority: receivedKeyPair.publicKey,
            mintAuthority: wallet.publicKey,
            globalState,
        })
            .signers([mintKeypair])
            .postInstructions([
                await program.methods.mint(
                    testNftTitle, testNftSymbol, testNftUri,
                ).accounts({
                    masterEdition: masterEditionAddress,
                    metadata: metadataAddress,
                    mint: mintKeypair.publicKey,
                    mintAuthority: wallet.publicKey,
                    tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
                })
                    .signers([mintKeypair])
                    .instruction()
            ]).rpc();
        console.log(tx);
    } catch (err) {
        console.error(err);
    }
})()
