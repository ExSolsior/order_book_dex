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

const formatWithCommas = (num: string) => {
  const [integerPart, decimalPart] = num.split('.');
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decimalPart ? `${formattedInteger}.${decimalPart}` : formattedInteger;
};

export const displayValue = (value: bigint, decimal: number, truncate: number = 0) => {
  const num = []
  const shift = BigInt(10 ** decimal);
  const base = value / shift

  if (truncate < decimal) {
    num.push(base.toString());
    const decimalPart = (value - (base * shift))
    .toString()
    .padStart(decimal, "0")
    .slice(0, decimal - truncate);
  
    // Remove trailing zeros from the decimal part
    const trimmedDecimalPart = decimalPart.replace(/0+$/, '');

    // Check if the decimal part is empty after trimming
    if (trimmedDecimalPart.length > 0) {
      num.push(trimmedDecimalPart);
    }

  } else if (truncate - decimal < base.toString().length) {
    num.push(base.toString().slice(0, truncate - decimal));

  } else {
    num.push((0).toString())
    num.push("..")
  }

  return formatWithCommas(num.join("."));
};
