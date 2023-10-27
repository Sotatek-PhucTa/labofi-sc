import * as anchor from "@coral-xyz/anchor";
import dotenv from "dotenv";
import {
  getLabofiProgram,
  getWalletSuite,
  uploadMetadataFile,
} from "./helpers";
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

  const [mintAddress] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("bronze"), receivedKeyPair.publicKey.toBuffer()],
    program.programId
  );

  const tokenAddress = anchor.utils.token.associatedAddress({
    mint: mintAddress,
    owner: receivedKeyPair.publicKey,
  });
  console.log(`New token: ${mintAddress.toBase58()}`);

  const metadataAddress = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mintAddress.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  )[0];
  console.log("Metadata initialized");

  const masterEditionAddress = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mintAddress.toBuffer(),
      Buffer.from("edition"),
    ],
    TOKEN_METADATA_PROGRAM_ID
  )[0];
  console.log("Master edition metadata initialized");

  const globalState = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("global")],
    program.programId
  )[0];

  try {
    const nftTitle = "Labofi_Profile";
    const nftSymbol = "PROFILE";
    const { uri } = await uploadMetadataFile(
      metaplex,
      nftTitle,
      nftSymbol,
      "test_image.png",
      "bronze"
    );
    const tx = await program.methods
      .initNftAccount({ bronze: {} }, 30, 10, 5)
      .accounts({
        mint: mintAddress,
        tokenAccount: tokenAddress,
        tokenAccountAuthority: receivedKeyPair.publicKey,
        mintAuthority: wallet.publicKey,
        globalState,
      })
      .postInstructions([
        await program.methods
          .mint({ bronze: {} }, nftTitle, nftSymbol, uri)
          .accounts({
            masterEdition: masterEditionAddress,
            metadata: metadataAddress,
            mint: mintAddress,
            mintAuthority: wallet.publicKey,
            tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
            tokenAccountAuthority: receivedKeyPair.publicKey,
          })
          .instruction(),
      ])
      .rpc();
    console.log(tx);
  } catch (err) {
    console.error(err);
  }
})();
