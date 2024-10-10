import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { OrderBookDex } from "../target/types/order_book_dex";

import {
  getAssociatedTokenAddress,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
  createMintToInstruction,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  // ASSOCIATED_TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
} from "@solana/spl-token";
import { publicKey } from "@coral-xyz/anchor/dist/cjs/utils";
import { SYSTEM_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/native/system";

describe("order_book_dex", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const {
    Keypair,
    PublicKey,
  } = anchor.web3

  const provider = <AnchorProvider>anchor.getProvider();
  const program = anchor.workspace.OrderBookDex as Program<OrderBookDex>;
  const wallet = provider.wallet as Wallet
  const users = [];
  const tokenMints = [];



  before(async () => {
    await Promise.all(
      new Array(10).fill(0).map(() => {
        return new Promise<void>(async (resolve, reject) => {

          const keypair = anchor.web3.Keypair.generate()
          users.push({ keypair });

          try {
            const tx = await provider.connection.requestAirdrop(
              keypair.publicKey,
              10000 * anchor.web3.LAMPORTS_PER_SOL
            )

            const latestBlockHash = await provider.connection.getLatestBlockhash()
            await provider.connection.confirmTransaction({
              blockhash: latestBlockHash.blockhash,
              lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
              signature: tx,
            });

            resolve();

          } catch (err) {
            reject(err);
          }
        })
      }));

    await Promise.all(
      new Array(2).fill(0).map(() => {
        return new Promise<void>(async (resolve, reject) => {

          try {

            const mint = await createMint(
              provider.connection,
              wallet.payer,
              wallet.publicKey,
              wallet.publicKey,
              9, // should do random from 4 to 9,
              Keypair.generate(),
              {
                skipPreflight: true,
                commitment: 'finalized',
              },
              TOKEN_PROGRAM_ID, // should randomize between TOKEN_PROGRAM_ID and TOKEN_PROGRAM_2022_ID
            )

            tokenMints.push({ mint })

            resolve()
          } catch (err) {
            console.log(err)
            reject(err)
          }

        })
      }))

  })

  it("Is initialized!", async () => {
    // Add your test here.

    console.log(tokenMints[0])

    const [orderBookConfig] = PublicKey.findProgramAddressSync([
      tokenMints[0].mint.toBuffer(),
      tokenMints[1].mint.toBuffer(),
      Buffer.from('order-book-config'),
    ], program.programId);

    const [bidMarketPointer] = PublicKey.findProgramAddressSync([
      Buffer.from('bid-market-pointer'),
      orderBookConfig.toBuffer(),
      Buffer.from('market-pointer'),
    ], program.programId);

    const [askMarketPointer] = PublicKey.findProgramAddressSync([
      Buffer.from('ask-market-pointer'),
      orderBookConfig.toBuffer(),
      Buffer.from('market-pointer'),
    ], program.programId);

    let tokenMintA = tokenMints[0].mint
    let tokenMintB = tokenMints[1].mint
    if (!(tokenMints[0].mint < tokenMints[1].mint)) {
      tokenMintA = tokenMints[1].mint
      tokenMintB = tokenMints[0].mint
    }

    const tx = await program.methods
      .createTradePair(false)
      .accounts({
        authority: wallet.publicKey,
        // orderBookConfig: orderBookConfig,
        // bidMarketPointer,
        // askMarketPointer,
        tokenMintA,
        tokenMintB,
        tokenProgramA: TOKEN_PROGRAM_ID,
        tokenProgramB: TOKEN_PROGRAM_ID,
        // systemProgram: SYSTEM_PROGRAM_ID,
      })
      .signers([wallet.payer])
      .rpc();
    console.log("Your transaction signature", tx);
  });
});
