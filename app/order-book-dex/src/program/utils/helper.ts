import { web3 } from "@coral-xyz/anchor";
import { Connection, PublicKey, TransactionSignature } from "@solana/web3.js";

export const shortenPk = (pk: PublicKey, chars = 5) => {
  const pkStr = typeof pk === "object" ? pk.toBase58() : pk;
  return `${pkStr.slice(0, chars)}...${pkStr.slice(-chars)}`;
};

export const confirmTx = async (
  txHash: TransactionSignature,
  connection: Connection
) => {
  const blockhashInfo = await connection.getLatestBlockhash();
  await connection.confirmTransaction({
    blockhash: blockhashInfo.blockhash,
    lastValidBlockHeight: blockhashInfo.lastValidBlockHeight,
    signature: txHash
  });
};

// Generate Versioned Transaction
export const createVersionedTransaction = async (
  connection: Connection,
  instructions: web3.TransactionInstruction[],
  payer: web3.PublicKey
): Promise<web3.VersionedTransaction> => {
  try {
    const latestBlockhash = await connection.getLatestBlockhash();

    // Generate Transaction Message
    const messageV0 = new web3.TransactionMessage({
      payerKey: payer,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: instructions
    }).compileToV0Message(); // ATL goes here

    const transaction = new web3.VersionedTransaction(messageV0);
    return transaction;
  } catch (error) {
    console.error("Failed to generate versioned transaction: ", error);
    throw error;
  }
};
