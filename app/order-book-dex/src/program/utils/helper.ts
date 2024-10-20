import { AnchorProvider, Program, web3 } from "@coral-xyz/anchor";
import { AnchorWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Connection, TransactionSignature, Signer, } from "@solana/web3.js";
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

// Generate Versioned Transaction
export const generateVersionedTransaction = async (
    connection: Connection,
    instructions: web3.TransactionInstruction[],
    payer: Signer
): Promise<web3.VersionedTransaction> => {
    // Get the latest blockhash
    const latestBlockhash = await connection.getLatestBlockhash();

    // Generate Transaction Message
    const messageV0 = new web3.TransactionMessage({
        payerKey: payer.publicKey,
        recentBlockhash: latestBlockhash.blockhash,
        instructions: instructions,
    }).compileToV0Message();

    // Create a Versioned Transaction
    const transaction = new web3.VersionedTransaction(messageV0);

    transaction.sign([payer]);

    return transaction; // Return the generated transaction
};
