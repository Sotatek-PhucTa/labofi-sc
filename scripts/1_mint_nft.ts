import * as anchor from "@coral-xyz/anchor";
import dotenv from "dotenv";
import {getLabofiProgram, getWalletSuite, uploadMetadataFile} from "./helpers";
dotenv.config();

(async () => {
    const { provider, wallet, metaplex } = await getWalletSuite("devnet", false);
    console.log("Public key is ", wallet.publicKey.toBase58());
    const program = getLabofiProgram(provider);
    console.log("Program is ", program.programId.toBase58());

    const receivedKeyPair = anchor.web3.Keypair.generate();
    console.log("Received address ", receivedKeyPair.publicKey.toBase58());

    const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey(
        "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
    );



    const mintKeypair: anchor.web3.Keypair = anchor.web3.Keypair.generate();
    const tokenAddress = anchor.utils.token.associatedAddress({
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
    console.log("Metadata initialized");

    const masterEditionAddress = anchor.web3.PublicKey.findProgramAddressSync(
        [
            Buffer.from("metadata"),
            TOKEN_METADATA_PROGRAM_ID.toBuffer(),
            mintKeypair.publicKey.toBuffer(),
            Buffer.from("edition"),
        ],
        TOKEN_METADATA_PROGRAM_ID,
    )[0];
    console.log("Master edition metadata initialized");

    const globalState = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("global"),
      ],
      program.programId,
    )[0];

    try {
        const nftTitle = "Labofi_Profile";
        const nftSymbol = "PROFILE";
        const { uri } = await uploadMetadataFile(metaplex, nftTitle, nftSymbol, "test_image.png", "bronze");
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
                    nftTitle, nftSymbol, uri,
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
