import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { BN } from "bn.js";
import { assert } from "chai";
import { getLabofiProgram, getWalletSuite } from "../scripts/helpers";
import { LabofiSolanaSmartContract } from "../target/types/labofi_solana_smart_contract";

describe("labofi-solana-smart-contract", async () => {
  const testNftTitle = "Labofi_Profile";
  const testNftSymbol = "PROFILE";
  const testNftUri = "ipfs:://QmexKAGNCb3DqSJCkSskg5aB2fdAk1BZMH7ZQLwwZe9p98";

  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  const wallet = provider.wallet as anchor.Wallet;
  anchor.setProvider(provider);

  const receivedKeyPair = anchor.web3.Keypair.generate();
  console.log("Received address ", receivedKeyPair.publicKey.toBase58());

  const program = anchor.workspace
    .LabofiSolanaSmartContract as Program<LabofiSolanaSmartContract>;

  const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
  );

  it("Initialize contract", async () => {
    // Add your test here.
    const globalState = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("global")],
      program.programId
    )[0];
    try {
      const tx = await program.methods
        .initContract()
        .accounts({
          globalState: globalState,
          admin: wallet.publicKey,
        })
        .rpc();
      console.log(tx);
    } catch (err) {
      console.error(err);
      throw err;
    }

    const globalStateAccount = await program.account.globalState.fetch(
      globalState
    );
    assert(globalStateAccount.admin.toBase58() === wallet.publicKey.toBase58());
    console.log(
      "Global state mintTime ",
      globalStateAccount.mintTime.toString()
    );
    assert(globalStateAccount.mintTime.gt(new BN(0)));
  });

  it("Mint successs", async () => {
    // Add your test here.
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
      TOKEN_METADATA_PROGRAM_ID
    )[0];
    console.log("Metadata initialized");

    const masterEditionAddress = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mintKeypair.publicKey.toBuffer(),
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
      const tx = await program.methods
        .initNftAccount()
        .accounts({
          mint: mintKeypair.publicKey,
          tokenAccount: tokenAddress,
          tokenAccountAuthority: receivedKeyPair.publicKey,
          mintAuthority: wallet.publicKey,
          globalState,
        })
        .signers([mintKeypair])
        .postInstructions([
          await program.methods
            .mint(testNftTitle, testNftSymbol, testNftUri)
            .accounts({
              masterEdition: masterEditionAddress,
              metadata: metadataAddress,
              mint: mintKeypair.publicKey,
              mintAuthority: wallet.publicKey,
              tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
            })
            .signers([mintKeypair])
            .instruction(),
        ])
        .rpc();
      console.log(tx);
    } catch (err) {
      console.error(err);
      throw err;
    }
  });

  it("Mint failure NotAuthorized", async () => {
    const { provider, wallet, keyPair } = await getWalletSuite("devnet", true);
    console.log("New wallet is ", wallet.publicKey.toBase58());
    const newProgram = getLabofiProgram(provider);
    try {
      const txAirdrop = await provider.connection.requestAirdrop(
        wallet.publicKey,
        5000000
      );
      console.log("Tx airdrop ", txAirdrop);
    } catch (err) {
      console.error("Error airdrop");
      console.error(err);
      throw err;
    }
    // Add your test here.
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
      TOKEN_METADATA_PROGRAM_ID
    )[0];
    console.log("Metadata initialized");

    const masterEditionAddress = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mintKeypair.publicKey.toBuffer(),
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
      const tx = await newProgram.methods
        .initNftAccount()
        .accounts({
          mint: mintKeypair.publicKey,
          tokenAccount: tokenAddress,
          tokenAccountAuthority: receivedKeyPair.publicKey,
          mintAuthority: wallet.publicKey,
          globalState,
        })
        .signers([mintKeypair, keyPair])
        .postInstructions([
          await program.methods
            .mint(testNftTitle, testNftSymbol, testNftUri)
            .accounts({
              masterEdition: masterEditionAddress,
              metadata: metadataAddress,
              mint: mintKeypair.publicKey,
              mintAuthority: wallet.publicKey,
              tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
            })
            .signers([mintKeypair, keyPair])
            .instruction(),
        ])
        .rpc();
      console.log(tx);
    } catch (err) {
      console.error(err);
      assert(err.error.errorCode.code === "NotAuthorized");
    }
  });
});
