import * as anchor from "@coral-xyz/anchor";
import { web3 } from "@coral-xyz/anchor";
import {Metaplex, keypairIdentity, bundlrStorage, toMetaplexFile} from "@metaplex-foundation/js";
import bs58 from "bs58";
import dotenv from "dotenv";
dotenv.config();
import { LabofiSolanaSmartContract } from "../target/types/labofi_solana_smart_contract";
import fs from "fs";
import path from "path";

export async function getWalletSuite(network: "devnet" | "mainnet", newWallet: boolean) {
    let keyPair: web3.Keypair = null;
    if (newWallet) {
        keyPair = web3.Keypair.generate();
    } else {
        const secretKey = process.env.SECRET_KEY || "";
        keyPair = web3.Keypair.fromSecretKey(bs58.decode(secretKey));
    }
    const wallet = new anchor.Wallet(keyPair);
    let url = "";
    let bundlrAddr = "";
    if (network === "devnet") {
        url = process.env.DEVNET_URL || "https://api.devnet.solana.com";
        bundlrAddr = "https://devnet.bundlr.network";
    } else if (network === "mainnet") {
        url = process.env.MAINNET_URL || "https://api.mainnet.solana.com";
        bundlrAddr = "https://mainnet.bundlr.network";
    }
    const connection = new web3.Connection(url);
    const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(keyPair), { commitment: "confirmed" });
    const metaplex = Metaplex.make(connection)
        .use(keypairIdentity(keyPair))
        .use(bundlrStorage({
            address: bundlrAddr,
            providerUrl: url,
            timeout: 60000,
        }));
    anchor.setProvider(provider);
    const program =  anchor.workspace.LabofiSolanaSmartContract as anchor.Program<LabofiSolanaSmartContract>;
    return { provider, wallet, keyPair, connection, metaplex, program };
}

export function getLabofiProgram(provider: anchor.Provider) {
    anchor.setProvider(provider);
    return anchor.workspace.LabofiSolanaSmartContract as anchor.Program<LabofiSolanaSmartContract>;
}

export async function uploadMetadataFile(metaplex: Metaplex, nftTitle: string, nftSymbol: string, imgName: string, rankType: "bronze" | "silver") {
    const imagePath = path.join(__dirname, "../assets/images", imgName);
    const image = fs.readFileSync(imagePath);
    return await metaplex.nfts().uploadMetadata({
        name: nftTitle,
        symbol: nftSymbol,
        image: toMetaplexFile(image, "image.png"),
        attributes: [
            {
                trait_type: "rank",
                value: rankType,
            }
        ]
    })
}
