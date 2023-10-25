import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { BN } from "bn.js";
import { assert } from "chai";
import { delay, getLabofiProgram, getWalletSuite } from "../scripts/helpers";
import { LabofiSolanaSmartContract } from "../target/types/labofi_solana_smart_contract";
import { expect } from "chai";

describe("labofi-solana-smart-contract", async () => {
  const testNftTitle = "Labofi_Profile";
  const testNftSymbol = "PROFILE";
  const testNftUri =
    "https://arweave.net/Bu0o_EDhq9Iq_4Cr2_RPTNkKncrHMyQ2FxD1vxwLXPM";

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

  it("Initialize tracking state success", async () => {
    const userKeyPair = anchor.web3.Keypair.generate();
    let [trackingState] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("tracking"), userKeyPair.publicKey.toBuffer()],
      program.programId
    );

    const globalState = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("global")],
      program.programId
    )[0];

    try {
      const tx = await program.methods
        .initTrackingState()
        .accounts({
          trackingState,
          userAccount: userKeyPair.publicKey,
          initializer: wallet.publicKey,
          globalState,
        })
        .rpc();
      console.log(tx);
    } catch (err) {
      console.error(err);
      throw err;
    }

    const trackingStateAccount = await program.account.trackingState.fetch(
      trackingState
    );
    console.log(trackingStateAccount.countedRank);
    assert(trackingStateAccount.countedRank[0] === 1);
    expect(trackingStateAccount.currentRank).haveOwnProperty("white");
  });

  it("Mint successs", async () => {
    // Add your test here.
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
      const tx = await program.methods
        .initNftAccount({ bronze: {} })
        .accounts({
          mint: mintAddress,
          tokenAccount: tokenAddress,
          tokenAccountAuthority: receivedKeyPair.publicKey,
          mintAuthority: wallet.publicKey,
          globalState,
        })
        .postInstructions([
          await program.methods
            .mint({ bronze: {} }, testNftTitle, testNftSymbol, testNftUri)
            .accounts({
              masterEdition: masterEditionAddress,
              metadata: metadataAddress,
              mint: mintAddress,
              mintAuthority: wallet.publicKey,
              tokenAccountAuthority: receivedKeyPair.publicKey,
              tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
            })
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
    const [mintAddress] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("bronze"), wallet.publicKey.toBuffer()],
      program.programId
    );
    const newProgram = getLabofiProgram(provider);
    try {
      const txAirdrop = await provider.connection.requestAirdrop(
        wallet.publicKey,
        5000000
      );
      console.log("Tx airdrop ", txAirdrop);
      await delay(5000);
    } catch (err) {
      console.error("Error airdrop");
      console.error(err);
      throw err;
    }
    // Add your test here.
    const tokenAddress = anchor.utils.token.associatedAddress({
      mint: mintAddress,
      owner: wallet.publicKey,
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
      const tx = await newProgram.methods
        .initNftAccount({ bronze: {} })
        .accounts({
          mint: mintAddress,
          tokenAccount: tokenAddress,
          tokenAccountAuthority: wallet.publicKey,
          mintAuthority: wallet.publicKey,
          globalState,
        })
        .signers([keyPair])
        .postInstructions([
          await program.methods
            .mint({ bronze: {} }, testNftTitle, testNftSymbol, testNftUri)
            .accounts({
              masterEdition: masterEditionAddress,
              metadata: metadataAddress,
              mint: mintAddress,
              mintAuthority: wallet.publicKey,
              tokenAccountAuthority: wallet.publicKey,
              tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
            })
            .signers([keyPair])
            .instruction(),
        ])
        .rpc();
      console.log(tx);
    } catch (err) {
      console.error(err);
      assert(err.error.errorCode.code === "NotAuthorized");
    }
  });

  it("Close global state failure unauthorized", async () => {
    const globalState = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("global")],
      program.programId
    )[0];

    const { provider, wallet } = await getWalletSuite("devnet", true);
    console.log("New wallet is ", wallet.publicKey.toBase58());
    const newProgram = getLabofiProgram(provider);

    try {
      const tx = await program.methods
        .closeGlobalState()
        .accounts({
          globalState,
          closeAuthorizer: wallet.publicKey,
        })
        .rpc();
      console.log("Close done with tx ", tx);
    } catch (err) {
      console.error(err);
      assert(err.toString().includes("Signature verification failed"));
    }
  });

  it("Close global state success", async () => {
    const globalState = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("global")],
      program.programId
    )[0];

    try {
      const tx = await program.methods
        .closeGlobalState()
        .accounts({
          globalState,
          closeAuthorizer: wallet.publicKey,
        })
        .rpc();
      console.log("Close done with tx ", tx);
    } catch (err) {
      console.error(err);
      throw err;
    }
  });
});
