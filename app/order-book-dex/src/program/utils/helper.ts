import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { AnchorWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Connection, TransactionSignature, } from "@solana/web3.js";
import { CHRONO_IDL } from "./constants";

export const shortenPk = (pk: PublicKey, chars = 5) => {
    const pkStr = typeof pk === "object" ? pk.toBase58() : pk;
    return `${pkStr.slice(0, chars)}...${pkStr.slice(-chars)}`;
  };

// Confirming transactions (might be changed)
export const confirmTx = async (txHash: TransactionSignature, connection: Connection) => {
    const blockhashInfo = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      blockhash: blockhashInfo.blockhash,
      lastValidBlockHeight: blockhashInfo.lastValidBlockHeight,
      signature: txHash,
    });
};

// Fetching Program
export const getProgram = (connection: Connection, wallet: AnchorWallet) => {
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  const program = new Program(CHRONO_IDL, provider);

  return program;
};