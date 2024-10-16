import { AnchorProvider, BN, Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import {
  CHRONO_IDL,
  PROGRAM_ID,
} from "./utils/constants";

// Fetching Program
export const getProgram = (connection: any, wallet: any) => {
    const provider = new AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });
  
    const program = new Program(CHRONO_IDL, PROGRAM_ID, provider);
  
    console.log("Program ID:", PROGRAM_ID.toBase58());
  
    return program;
};

/* Deriving PDA accounts addresses */

export const getOrderBookConfig = async (tokenMintA: PublicKey, tokenMintB: PublicKey) => {
    return (
      await PublicKey.findProgramAddressSync(
        [
          tokenMintA.toBuffer(),
          tokenMintB.toBuffer(),
          Buffer.from("order-book-config")
        ],
        PROGRAM_ID
      )
    )[0];
};

export const getBuyMarketPointer = async (orderBookConfig: PublicKey) => {
    return (
      await PublicKey.findProgramAddressSync(
        [
          Buffer.from("buy-market-pointer"),
          orderBookConfig.toBuffer(),
          Buffer.from("market-pointer")
        ],
        PROGRAM_ID
      )
    )[0];
};

export const getSellMarketPointer = async (orderBookConfig: PublicKey) => {
    return (
      await PublicKey.findProgramAddressSync(
        [
          Buffer.from("sell-market-pointer"),
          orderBookConfig.toBuffer(),
          Buffer.from("market-pointer")
        ],
        PROGRAM_ID
      )
    )[0];
};

export const getVaultAccount = async (orderBookConfig: PublicKey, tokenMint: PublicKey, signer: PublicKey) => {
    return (
      await PublicKey.findProgramAddressSync(
        [
          orderBookConfig.toBuffer(),
          tokenMint.toBuffer(),
          signer.toBuffer(),
          Buffer.from("vault-account")
        ],
        PROGRAM_ID
      )
    )[0];
};

export const getOrderPositionConfig = async (signer: PublicKey, orderBookConfig: PublicKey) => {
    return (
      await PublicKey.findProgramAddressSync(
        [
          signer.toBuffer(),
          orderBookConfig.toBuffer(),
          Buffer.from("order-position-config")
        ],
        PROGRAM_ID
      )
    )[0];
};

export const getOrderPosition = async (orderPositionConfig: PublicKey, nonce: BN, signer: PublicKey) => {
    return (
      await PublicKey.findProgramAddressSync(
        [
          nonce.toArrayLike(Buffer, 'le', 8),
          signer.toBuffer(),
          Buffer.from("order-position")
        ],
        PROGRAM_ID
      )
    )[0];
};
