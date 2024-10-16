export const shortenPk = (pk: any, chars = 5) => {
    const pkStr = typeof pk === "object" ? pk.toBase58() : pk;
    return `${pkStr.slice(0, chars)}...${pkStr.slice(-chars)}`;
  };
  
export const confirmTx = async (txHash: any, connection: any) => {
    const blockhashInfo = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      blockhash: blockhashInfo.blockhash,
      lastValidBlockHeight: blockhashInfo.lastValidBlockHeight,
      signature: txHash,
    });
};