import { PublicKey, Connection, TransactionSignature } from "@solana/web3.js";

export const shortenPk = (pk: PublicKey, chars = 5) => {
    const pkStr = typeof pk === "object" ? pk.toBase58() : pk;
    return `${pkStr.slice(0, chars)}...${pkStr.slice(-chars)}`;
  };
  
export const confirmTx = async (txHash: TransactionSignature, connection: Connection) => {
    const blockhashInfo = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      blockhash: blockhashInfo.blockhash,
      lastValidBlockHeight: blockhashInfo.lastValidBlockHeight,
      signature: txHash,
    });
};