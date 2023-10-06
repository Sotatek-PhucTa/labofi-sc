import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { LabofiSolanaSmartContract } from "../target/types/labofi_solana_smart_contract";

describe("labofi-solana-smart-contract", () => {
  const testNftTitle = "Labofi_Profile";
  const testNftSymbol = "PROFILE";
  const testNftUri = "ipfs:://QmexKAGNCb3DqSJCkSskg5aB2fdAk1BZMH7ZQLwwZe9p98";

  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  const wallet = provider.wallet as anchor.Wallet;
  anchor.setProvider(provider);


  const program = anchor.workspace.LabofiSolanaSmartContract as Program<LabofiSolanaSmartContract>;

  const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
  );  

  it("Mint initialized!", async () => {
    // Add your test here.
    const mintKeypair: anchor.web3.Keypair = anchor.web3.Keypair.generate();
    const tokenAddress = await anchor.utils.token.associatedAddress({
      mint: mintKeypair.publicKey,
      owner: wallet.publicKey,
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

    try {
      console.log("tx1");
      const tx1 = await program.methods.initAccount(
        testNftTitle, testNftSymbol, testNftUri,
      ).accounts({
        masterEdition: masterEditionAddress,
        metadata: metadataAddress,
        mint: mintKeypair.publicKey,
        tokenAccount: tokenAddress,
        mintAuthority: wallet.publicKey,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      })
      .signers([mintKeypair ])
      .rpc();
      console.log(tx1);
      console.log("tx2");
      const tx2 = await program.methods.mint(
        testNftTitle, testNftSymbol, testNftUri,
      ).accounts({
        masterEdition: masterEditionAddress,
        metadata: metadataAddress,
        mint: mintKeypair.publicKey,
        tokenAccount: tokenAddress,
        mintAuthority: wallet.publicKey,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      })
      .signers([mintKeypair ])
      .rpc();
      console.log(tx2);
    } catch (err) {
      console.error(err);
    }
  });
});
