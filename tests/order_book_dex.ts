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
  mintToChecked,
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
  const orderBookConfigAddressList = [];



  before(async () => {

    console.log('CREATING MINTS');
    await Promise.all(
      new Array(4).fill(0).map(() => {
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
              TOKEN_PROGRAM_ID,
            )

            // should randomize between TOKEN_PROGRAM_ID and TOKEN_PROGRAM_2022_ID
            tokenMints.push({ mint, program: TOKEN_PROGRAM_ID })

            resolve()
          } catch (err) {
            console.log(err)
            reject(err)
          }

        })
      }))

    console.log('SORT MINTS');
    tokenMints.sort((a, b) => a.mint._bn.sub(b.mint._bn));

    console.log('CREATING ORDER BOOK CONFIG ADDRESS LIST');
    Array(tokenMints.length - 1).fill(0).forEach((index) => {

      let tokenMintA = tokenMints[index].mint
      let tokenMintB = tokenMints[index + 1].mint

      const [orderBookConfig, bump] = PublicKey.findProgramAddressSync([
        tokenMintA.toBuffer(),
        tokenMintB.toBuffer(),
        Buffer.from('order-book-config'),
      ], program.programId);

      orderBookConfigAddressList.push({ publicKey: orderBookConfig, bump, tokenMintA, tokenMintB });

    });

    await Promise.all(
      new Array(6).fill(0).map(() => {

        console.log('CREATING USER');
        return new Promise<void>(async (resolve, reject) => {

          const keypair = anchor.web3.Keypair.generate()

          try {
            const tx = await provider.connection.requestAirdrop(
              keypair.publicKey,
              10000 * anchor.web3.LAMPORTS_PER_SOL
            );

            const latestBlockHash = await provider.connection.getLatestBlockhash()
            await provider.connection.confirmTransaction({
              blockhash: latestBlockHash.blockhash,
              lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
              signature: tx,
            });

            console.log('CREATING TOKEN ACCOUNTS');
            const tokenAccountList = await Promise.all(
              tokenMints.map((token) => {
                return getOrCreateAssociatedTokenAccount(
                  provider.connection,
                  wallet.payer,
                  token.mint,
                  keypair.publicKey,
                  false,
                  "finalized",
                  {
                    skipPreflight: true,
                    commitment: 'finalized',
                  },
                  token.program,
                  ASSOCIATED_TOKEN_PROGRAM_ID,
                )
              }));

            console.log('MINTING TOKENS');
            await Promise.all(
              tokenMints.map((token, index) => {
                return mintToChecked(
                  provider.connection,
                  wallet.payer,
                  token.mint,
                  tokenAccountList[index].address,
                  wallet.payer,
                  BigInt(100_000_000_000),
                  9,
                  [],
                  {
                    skipPreflight: true,
                    commitment: 'finalized',
                  },
                  token.program,
                )
              }));

            console.log('CREATING VAULT ACCOUNT ADDRESSES');
            const vaultAccountList = orderBookConfigAddressList.map(config => {
              const [vaultA] = PublicKey.findProgramAddressSync([
                config.publicKey.toBuffer(),
                config.tokenMintA.toBuffer(),
                keypair.publicKey.toBuffer(),
                Buffer.from('order-vaults'),
              ], program.programId);

              const [vaultB] = PublicKey.findProgramAddressSync([
                config.publicKey.toBuffer(),
                config.tokenMintB.toBuffer(),
                keypair.publicKey.toBuffer(),
                Buffer.from('order-vaults'),
              ], program.programId);

              return { config, vaultA, vaultB }
            })

            users.push({ keypair, tokenAccountList, vaultAccountList });
            resolve();

          } catch (err) {
            reject(err);
          }
        });

      }));

    console.log('SETUP FINISHED\n');

  })

  it("Create Trade Pair", async () => {

    let tokenMintA = tokenMints[0].mint
    let tokenMintB = tokenMints[1].mint

    const [orderBookConfig] = PublicKey.findProgramAddressSync([
      tokenMintA.toBuffer(),
      tokenMintB.toBuffer(),
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

    const latestBlockHash = await provider.connection.getLatestBlockhash()
    await provider.connection.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: tx,
    });

  });

  it("Create Order Position Config", async () => {

    let tokenMintA = tokenMints[0].mint
    let tokenMintB = tokenMints[1].mint

    const [orderBookConfig] = PublicKey.findProgramAddressSync([
      tokenMintA.toBuffer(),
      tokenMintB.toBuffer(),
      Buffer.from('order-book-config'),
    ], program.programId);

    const [orderPositionConfig] = PublicKey.findProgramAddressSync([
      users[0].keypair.publicKey.toBuffer(),
      orderBookConfig.toBuffer(),
      Buffer.from('order-position-config'),
    ], program.programId);

    const tx = await program.methods
      .createOrderPositionConfig()
      .accounts({
        signer: users[0].keypair.publicKey,
        orderBookConfig,
        // orderPositionConfig,
        // systemProgram: SYSTEM_PROGRAM_ID,
      })
      .signers([users[0].keypair])
      .rpc();

    const latestBlockHash = await provider.connection.getLatestBlockhash()
    await provider.connection.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: tx,
    });

  })

  it("Create Order Position -> Market Maker", async () => {

    let tokenMintA = tokenMints[0].mint
    let tokenMintB = tokenMints[1].mint

    const [orderBookConfig] = PublicKey.findProgramAddressSync([
      tokenMintA.toBuffer(),
      tokenMintB.toBuffer(),
      Buffer.from('order-book-config'),
    ], program.programId);

    const [orderPositionConfig] = PublicKey.findProgramAddressSync([
      users[0].keypair.publicKey.toBuffer(),
      orderBookConfig.toBuffer(),
      Buffer.from('order-position-config'),
    ], program.programId);



    const tx = await program.methods
      .createOrderPosition({ buy: {} }, new anchor.BN(100), new anchor.BN(100))
      .accounts({
        // signer: users[0].keypair.publicKey,
        // orderBookConfig,
        // orderPositionConfig,
        // orderPosition,
        // tokenMintA,
        // tokenMintB,
        // capitalSource,
        // source,
        // destination,
        // tokenProgramA, TOKEN_PROGRAM_ID,
        // tokenProgramB, TOKEN_PROGRAM_ID,
        // systemProgram
      })
      .signers([users[0].keypair])
      .rpc();

    const latestBlockHash = await provider.connection.getLatestBlockhash()
    await provider.connection.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: tx,
    });
  })

});
