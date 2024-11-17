import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { OrderBookDex } from "../target/types/order_book_dex";
import { assert } from "chai";

import {
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  mintToChecked,
  getAccount,
} from "@solana/spl-token";
import { SYSTEM_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/native/system";



// WHY AM I GETTING LINTER ERROR? THOUGH IT RUNS FINE?
describe("order_book_dex", () => {
  console.log(process.env.ANCHOR_BROWSER)

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const {
    Keypair,
    PublicKey,
    SystemProgram,
    Connection
  } = anchor.web3

  const provider = <AnchorProvider>anchor.getProvider();
  const program = anchor.workspace.OrderBookDex as Program<OrderBookDex>;
  const wallet = provider.wallet as Wallet
  const users = [];
  const tokenMints = [];
  const orderBookConfigAddressList = [];

  const connection = provider!.connection!;

  before(async () => {

    console.log('CREATING MINTS');
    await Promise.all(
      new Array(2).fill(0).map(() => {
        return new Promise<void>(async (resolve, reject) => {

          try {
            const mint = await createMint(
              connection,
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

      let tokenProgramA = tokenMints[index].program
      let tokenProgramB = tokenMints[index + 1].program

      const [orderBookConfig] = PublicKey.findProgramAddressSync([
        tokenMintA.toBuffer(),
        tokenMintB.toBuffer(),
        Buffer.from('order-book-config'),
      ], program.programId);

      orderBookConfigAddressList.push({
        publicKey: orderBookConfig,
        tokenMintA,
        tokenMintB,
        tokenProgramA,
        tokenProgramB,
        isReverse: false, // need to randomize
      });

    });

    await Promise.all(
      new Array(4).fill(0).map(() => {

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
                    commitment: 'confirmed',
                  },
                  token.program,
                )
              }));

            console.log('CREATING VAULT ACCOUNT ADDRESSES');
            const vaultAccountList = orderBookConfigAddressList.map((config, index) => {
              const [vaultA] = PublicKey.findProgramAddressSync([
                config.publicKey.toBuffer(),
                config.tokenMintA.toBuffer(),
                keypair.publicKey.toBuffer(),
                Buffer.from('vault-account'),
              ], program.programId);

              const [vaultB] = PublicKey.findProgramAddressSync([
                config.publicKey.toBuffer(),
                config.tokenMintB.toBuffer(),
                keypair.publicKey.toBuffer(),
                Buffer.from('vault-account'),
              ], program.programId);

              const [capitalSourceA, capitalSourceB] = [tokenAccountList[index], tokenAccountList[index + 1]];
              const { is_reverse } = config;

              // !is_reverse  -> vaultA is source on bid side, vaultB is source on ask side
              //              -> vaultB is dest on ask side, vaultA is dest on bid side
              //  is_reverse  -> vaultB is source on bid side, vaultA is source on ask side
              //              -> vaultA is dest on ask side, vaultB is dest on bid side
              return {
                config,
                tokenAccounts: [
                  {
                    side: "bid",
                    capitalSource: !is_reverse ? capitalSourceA : capitalSourceB,
                    capitalA: !is_reverse ? capitalSourceA : capitalSourceB,
                    capitalB: !is_reverse ? capitalSourceB : capitalSourceA,

                    source: !is_reverse ? vaultA : vaultB,
                    dest: !is_reverse ? vaultB : vaultA,
                    tokenMintA: !is_reverse ? config.tokenMintA : config.tokenMintB,
                    tokenMintB: !is_reverse ? config.tokenMintB : config.tokenMintA,
                    tokenProgramA: !is_reverse ? config.tokenProgramA : config.tokenProgramB,
                    tokenProgramB: !is_reverse ? config.tokenProgramB : config.tokenProgramA,
                  },
                  {
                    side: "ask",
                    capitalSource: !is_reverse ? capitalSourceB : capitalSourceA,
                    capitalA: !is_reverse ? capitalSourceB : capitalSourceA,
                    capitalB: !is_reverse ? capitalSourceA : capitalSourceB,

                    source: !is_reverse ? vaultB : vaultA,
                    dest: !is_reverse ? vaultA : vaultB,
                    tokenMintA: !is_reverse ? config.tokenMintB : config.tokenMintA,
                    tokenMintB: !is_reverse ? config.tokenMintA : config.tokenMintB,
                    tokenProgramA: !is_reverse ? config.tokenProgramB : config.tokenProgramA,
                    tokenProgramB: !is_reverse ? config.tokenProgramA : config.tokenProgramB,
                  },
                  {
                    side: "buy",
                    capitalSource: !is_reverse ? capitalSourceA : capitalSourceB,
                    capitalA: !is_reverse ? capitalSourceA : capitalSourceB,
                    capitalB: !is_reverse ? capitalSourceB : capitalSourceA,


                    source: !is_reverse ? vaultA : vaultB,
                    dest: !is_reverse ? vaultB : vaultA,
                    tokenMintA: !is_reverse ? config.tokenMintA : config.tokenMintB,
                    tokenMintB: !is_reverse ? config.tokenMintB : config.tokenMintA,
                    tokenProgramA: !is_reverse ? config.tokenProgramA : config.tokenProgramB,
                    tokenProgramB: !is_reverse ? config.tokenProgramB : config.tokenProgramA,
                  },
                  {
                    side: "sell",
                    capitalSource: !is_reverse ? capitalSourceB : capitalSourceA,
                    capitalA: !is_reverse ? capitalSourceB : capitalSourceA,
                    capitalB: !is_reverse ? capitalSourceA : capitalSourceB,


                    source: !is_reverse ? vaultB : vaultA,
                    dest: !is_reverse ? vaultA : vaultB,
                    tokenMintA: !is_reverse ? config.tokenMintB : config.tokenMintA,
                    tokenMintB: !is_reverse ? config.tokenMintA : config.tokenMintB,
                    tokenProgramA: !is_reverse ? config.tokenProgramB : config.tokenProgramA,
                    tokenProgramB: !is_reverse ? config.tokenProgramA : config.tokenProgramB,
                  }
                ],
                vaultA,
                vaultB,
                capitalSourceA,
                capitalSourceB,
                tokenMintA: config.tokenMintA,
                tokenMintB: config.tokenMintB,
              }
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

    const [buyMarketPointer] = PublicKey.findProgramAddressSync([
      Buffer.from('buy-market-pointer'),
      orderBookConfig.toBuffer(),
      Buffer.from('market-pointer'),
    ], program.programId);

    const [sellMarketPointer] = PublicKey.findProgramAddressSync([
      Buffer.from('sell-market-pointer'),
      orderBookConfig.toBuffer(),
      Buffer.from('market-pointer'),
    ], program.programId);



    const tx = await program.methods
      .createTradePair("USDC", "BTC", false)
      .accountsStrict({
        authority: wallet.publicKey,
        orderBookConfig: orderBookConfig,
        buyMarketPointer,
        sellMarketPointer,
        tokenMintA,
        tokenMintB,
        tokenProgramA: TOKEN_PROGRAM_ID,
        tokenProgramB: TOKEN_PROGRAM_ID,
        systemProgram: SYSTEM_PROGRAM_ID,
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

  it("Create Vault Accounts -> Market Maker", async () => {
    const makerTokenAccounts = users[0].vaultAccountList[0].tokenAccounts
      .find(list => list.side === 'bid');

    const tx = await program.methods
      .createVaultAccounts()
      .accountsStrict({
        signer: users[0].keypair.publicKey,
        orderBookConfig: orderBookConfigAddressList[0].publicKey,
        tokenMintA: orderBookConfigAddressList[0].tokenMintA,
        tokenMintB: orderBookConfigAddressList[0].tokenMintB,

        vaultA: users[0].vaultAccountList[0].vaultA,
        vaultB: users[0].vaultAccountList[0].vaultB,

        tokenProgramA: orderBookConfigAddressList[0].tokenProgramA,
        tokenProgramB: orderBookConfigAddressList[0].tokenProgramB,

        systemProgram: SYSTEM_PROGRAM_ID,
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

  describe("Market Maker", () => {

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
        .accountsPartial({
          signer: users[0].keypair.publicKey,
          orderBookConfig,
          orderPositionConfig,
          // capitalA: users[0].vaultAccountList[0].capitalSourceB,
          // capitalB: users[0].vaultAccountList[0].capitalSourceA,

          // capitalA: users[0].vaultAccountList[0].capitalSourceA,
          // capitalB: users[0].vaultAccountList[0].capitalSourceB,
          tokenMintA,
          tokenMintB,
          systemProgram: SYSTEM_PROGRAM_ID,
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

    describe("bid limit order", () => {
      it("Create Order Position", async () => {

        const signer = users[0].keypair;

        const {
          tokenMintA,
          tokenMintB,
          tokenProgramA,
          tokenProgramB,
        } = orderBookConfigAddressList[0];

        const makerTokenAccounts = users[0].vaultAccountList[0].tokenAccounts
          .find(list => list.side === 'bid');

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

        const bufNum = Buffer.allocUnsafe(8);
        const num = BigInt(0);
        bufNum.writeBigUInt64LE(num, 0);
        const [orderPosition] = PublicKey.findProgramAddressSync([
          bufNum,
          orderPositionConfig.toBuffer(),
          signer.publicKey.toBuffer(),
          Buffer.from('order-position'),
        ], program.programId);

        const tx = await program.methods
          .createOrderPosition({ bid: {} }, new anchor.BN(1_000_000), new anchor.BN(1_000_000))
          .accountsStrict({
            signer: signer.publicKey,
            orderBookConfig,
            orderPositionConfig,
            orderPosition,
            tokenMintA,
            tokenMintB,
            capitalSource: makerTokenAccounts.capitalSource.address,
            source: makerTokenAccounts.source,
            destination: makerTokenAccounts.dest,
            tokenProgramA,
            tokenProgramB,
            systemProgram: SYSTEM_PROGRAM_ID,
          })
          .signers([signer])
          .rpc();

        const latestBlockHash = await provider.connection.getLatestBlockhash()
        await provider.connection.confirmTransaction({
          blockhash: latestBlockHash.blockhash,
          lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
          signature: tx,
        });

        const data = await program.account.orderPosition.fetch(orderPosition)
        const capitalsource = await getAccount(program.provider.connection, makerTokenAccounts.capitalSource.address)

        const source = await getAccount(program.provider.connection, makerTokenAccounts.source)
        const dest = await getAccount(program.provider.connection, makerTokenAccounts.dest)

        console.log(data, source, dest)
        console.log(capitalsource)

      })

      it("Open Order Position", async () => {

        const signer = users[0].keypair;

        const {
          tokenMintA,
          tokenMintB,
        } = orderBookConfigAddressList[0];

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

        const bufNum = Buffer.allocUnsafe(8);
        const num = BigInt(0);
        bufNum.writeBigUInt64LE(num, 0);
        const [orderPosition] = PublicKey.findProgramAddressSync([
          bufNum,
          orderPositionConfig.toBuffer(),
          signer.publicKey.toBuffer(),
          Buffer.from('order-position'),
        ], program.programId);

        const [buyMarketPointer] = PublicKey.findProgramAddressSync([
          Buffer.from('buy-market-pointer'),
          orderBookConfig.toBuffer(),
          Buffer.from('market-pointer'),
        ], program.programId);

        const [sellMarketPointer] = PublicKey.findProgramAddressSync([
          Buffer.from('sell-market-pointer'),
          orderBookConfig.toBuffer(),
          Buffer.from('market-pointer'),
        ], program.programId);

        const tx = await program.methods
          .openOrderPosition()
          .accountsStrict({
            signer: signer.publicKey,
            orderBookConfig,
            orderPositionConfig,
            marketPointerRead: null,
            marketPointerWrite: sellMarketPointer,
            // contraPointer: null, // should fail because marketPointerWrite is being used
            contraPointer: buyMarketPointer, // should pass with MarketPointerWrite
            orderPosition,
            prevOrderPosition: null,
            nextOrderPosition: null,
            nextPositionPointer: null,
          })
          .signers([signer])
          .rpc();

        const latestBlockHash = await provider.connection.getLatestBlockhash()
        await provider.connection.confirmTransaction({
          blockhash: latestBlockHash.blockhash,
          lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
          signature: tx,
        });

      })
    })

    describe("ask limit order", () => {
      it("Create Order Position", async () => {

        const signer = users[0].keypair;

        const {
          tokenMintA,
          tokenMintB,
          tokenProgramA,
          tokenProgramB,
        } = orderBookConfigAddressList[0];

        const makerTokenAccounts = users[0].vaultAccountList[0].tokenAccounts
          .find(list => list.side === 'ask');

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

        const bufNum = Buffer.allocUnsafe(8);
        const num = BigInt(1);
        bufNum.writeBigUInt64LE(num, 0);
        const [orderPosition] = PublicKey.findProgramAddressSync([
          bufNum,
          orderPositionConfig.toBuffer(),
          signer.publicKey.toBuffer(),
          Buffer.from('order-position'),
        ], program.programId);

        const tx = await program.methods
          .createOrderPosition({ ask: {} }, new anchor.BN(15_000_000), new anchor.BN(10_000_000))
          .accountsStrict({
            signer: signer.publicKey,
            orderBookConfig,
            orderPositionConfig,
            orderPosition,
            tokenMintA,
            tokenMintB,
            capitalSource: makerTokenAccounts.capitalSource.address,
            source: makerTokenAccounts.source,
            destination: makerTokenAccounts.dest,
            tokenProgramA,
            tokenProgramB,
            systemProgram: SYSTEM_PROGRAM_ID,
          })
          .signers([signer])
          .rpc();

        const latestBlockHash = await provider.connection.getLatestBlockhash()
        await provider.connection.confirmTransaction({
          blockhash: latestBlockHash.blockhash,
          lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
          signature: tx,
        });

      })

      it("Open Order Position", async () => {

        const signer = users[0].keypair;

        const {
          tokenMintA,
          tokenMintB,
        } = orderBookConfigAddressList[0];

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

        const bufNum = Buffer.allocUnsafe(8);
        const num = BigInt(1);
        bufNum.writeBigUInt64LE(num, 0);
        const [orderPosition] = PublicKey.findProgramAddressSync([
          bufNum,
          orderPositionConfig.toBuffer(),
          signer.publicKey.toBuffer(),
          Buffer.from('order-position'),
        ], program.programId);

        const [buyMarketPointer] = PublicKey.findProgramAddressSync([
          Buffer.from('buy-market-pointer'),
          orderBookConfig.toBuffer(),
          Buffer.from('market-pointer'),
        ], program.programId);

        const [sellMarketPointer] = PublicKey.findProgramAddressSync([
          Buffer.from('sell-market-pointer'),
          orderBookConfig.toBuffer(),
          Buffer.from('market-pointer'),
        ], program.programId);

        const tx = await program.methods
          .openOrderPosition()
          .accountsStrict({
            signer: signer.publicKey,
            orderBookConfig,
            orderPositionConfig,
            marketPointerRead: null,
            marketPointerWrite: buyMarketPointer,
            // contraPointer: null, // should fail because marketPointerWrite is being used
            contraPointer: sellMarketPointer, // should pass with MarketPointerWrite
            orderPosition,
            prevOrderPosition: null,
            nextOrderPosition: null,
            nextPositionPointer: null,
          })
          .signers([signer])
          .rpc();

        const latestBlockHash = await provider.connection.getLatestBlockhash()
        await provider.connection.confirmTransaction({
          blockhash: latestBlockHash.blockhash,
          lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
          signature: tx,
        });

      })
    })

    // describe("bid limit order", () => {
    //   it("Create Order Position", async () => {

    //     const signer = users[0].keypair;

    //     const {
    //       tokenMintA,
    //       tokenMintB,
    //       tokenProgramA,
    //       tokenProgramB,
    //     } = orderBookConfigAddressList[0];

    //     const makerTokenAccounts = users[0].vaultAccountList[0].tokenAccounts
    //       .find(list => list.side === 'bid');

    //     const [orderBookConfig] = PublicKey.findProgramAddressSync([
    //       tokenMintA.toBuffer(),
    //       tokenMintB.toBuffer(),
    //       Buffer.from('order-book-config'),
    //     ], program.programId);

    //     const [orderPositionConfig] = PublicKey.findProgramAddressSync([
    //       users[0].keypair.publicKey.toBuffer(),
    //       orderBookConfig.toBuffer(),
    //       Buffer.from('order-position-config'),
    //     ], program.programId);

    //     const bufNum = Buffer.allocUnsafe(8);
    //     const num = BigInt(2);
    //     bufNum.writeBigUInt64LE(num, 0);
    //     const [orderPosition] = PublicKey.findProgramAddressSync([
    //       bufNum,
    //       orderPositionConfig.toBuffer(),
    //       signer.publicKey.toBuffer(),
    //       Buffer.from('order-position'),
    //     ], program.programId);

    //     const tx = await program.methods
    //       .createOrderPosition({ bid: {} }, new anchor.BN(1_000_000), new anchor.BN(1_000_000))
    //       .accountsStrict({
    //         signer: signer.publicKey,
    //         orderBookConfig,
    //         orderPositionConfig,
    //         orderPosition,
    //         tokenMintA,
    //         tokenMintB,
    //         capitalSource: makerTokenAccounts.capitalSource.address,
    //         source: makerTokenAccounts.source,
    //         destination: makerTokenAccounts.dest,
    //         tokenProgramA,
    //         tokenProgramB,
    //         systemProgram: SYSTEM_PROGRAM_ID,
    //       })
    //       .signers([signer])
    //       .rpc();

    //     const latestBlockHash = await provider.connection.getLatestBlockhash()
    //     await provider.connection.confirmTransaction({
    //       blockhash: latestBlockHash.blockhash,
    //       lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
    //       signature: tx,
    //     });

    //     const data = await program.account.orderPosition.fetch(orderPosition)
    //     const capitalsource = await getAccount(program.provider.connection, makerTokenAccounts.capitalSource.address)

    //     const source = await getAccount(program.provider.connection, makerTokenAccounts.source)
    //     const dest = await getAccount(program.provider.connection, makerTokenAccounts.dest)

    //     console.log(data, source, dest)
    //     console.log(capitalsource)

    //   })

    //   it("Open Order Position", async () => {

    //     const signer = users[0].keypair;

    //     const {
    //       tokenMintA,
    //       tokenMintB,
    //     } = orderBookConfigAddressList[0];

    //     const [orderBookConfig] = PublicKey.findProgramAddressSync([
    //       tokenMintA.toBuffer(),
    //       tokenMintB.toBuffer(),
    //       Buffer.from('order-book-config'),
    //     ], program.programId);

    //     const [orderPositionConfig] = PublicKey.findProgramAddressSync([
    //       users[0].keypair.publicKey.toBuffer(),
    //       orderBookConfig.toBuffer(),
    //       Buffer.from('order-position-config'),
    //     ], program.programId);

    //     const bufNum = Buffer.allocUnsafe(8);
    //     const num = BigInt(2);
    //     bufNum.writeBigUInt64LE(num, 0);
    //     const [orderPosition] = PublicKey.findProgramAddressSync([
    //       bufNum,
    //       orderPositionConfig.toBuffer(),
    //       signer.publicKey.toBuffer(),
    //       Buffer.from('order-position'),
    //     ], program.programId);

    //     const [buyMarketPointer] = PublicKey.findProgramAddressSync([
    //       Buffer.from('buy-market-pointer'),
    //       orderBookConfig.toBuffer(),
    //       Buffer.from('market-pointer'),
    //     ], program.programId);

    //     const [sellMarketPointer] = PublicKey.findProgramAddressSync([
    //       Buffer.from('sell-market-pointer'),
    //       orderBookConfig.toBuffer(),
    //       Buffer.from('market-pointer'),
    //     ], program.programId);

    //     const tx = await program.methods
    //       .openOrderPosition()
    //       .accountsStrict({
    //         signer: signer.publicKey,
    //         orderBookConfig,
    //         orderPositionConfig,
    //         marketPointerRead: null,
    //         marketPointerWrite: sellMarketPointer,
    //         // contraPointer: null, // should fail because marketPointerWrite is being used
    //         contraPointer: buyMarketPointer, // should pass with MarketPointerWrite
    //         orderPosition,
    //         prevOrderPosition: null,
    //         nextOrderPosition: null,
    //         nextPositionPointer: null,
    //       })
    //       .signers([signer])
    //       .rpc();

    //     const latestBlockHash = await provider.connection.getLatestBlockhash()
    //     await provider.connection.confirmTransaction({
    //       blockhash: latestBlockHash.blockhash,
    //       lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
    //       signature: tx,
    //     });

    //   })
    // })

  })

  describe("Market Taker", () => {

    before(async () => {
      // set up the taker source and destination accounts
      // also need to transfer some tokens to these accounts
      const taker = users[1].keypair;
      const takerTokenAccounts = users[1].vaultAccountList[0].tokenAccounts
        .find(list => list.side === 'sell');

      const tx = await program.methods
        .createVaultAccounts()
        .accounts({
          signer: taker.publicKey,
          orderBookConfig: orderBookConfigAddressList[0].publicKey,
          tokenMintA: orderBookConfigAddressList[0].tokenMintA,
          tokenMintB: orderBookConfigAddressList[0].tokenMintB,

          // vaultA: user[0].vaultAccountList[0].vaultA,
          // vaultB: user[0].vaultAccountList[0].vaultB,

          tokenProgramA: orderBookConfigAddressList[0].tokenProgramA,
          tokenProgramB: orderBookConfigAddressList[0].tokenProgramB,

          // systemProgram: SYSTEM_PROGRAM_ID,
        })
        .signers([taker])
        .rpc();

      const latestBlockHash = await provider.connection.getLatestBlockhash()
      await provider.connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: tx,
      });

      const tokenAccountList = [
        { address: takerTokenAccounts.source },
        { address: takerTokenAccounts.dest },
      ]

      await Promise.all(
        [
          {
            mint: takerTokenAccounts.tokenMintA,
            program: takerTokenAccounts.tokenProgramA,
          },
          {
            mint: takerTokenAccounts.tokenMintB,
            program: takerTokenAccounts.tokenProgramB,
          }
        ].map((token, index) => {
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
              commitment: 'confirmed',
            },
            token.program,
          )
        }));

    })

    it("Create Market Order", async () => {


      const signer = users[1].keypair;

      const {
        tokenMintA,
        tokenMintB,
      } = orderBookConfigAddressList[0];
      const takerTokenAccounts = users[1].vaultAccountList[0].tokenAccounts
        .find(list => list.side === 'sell');

      const [orderBookConfig] = PublicKey.findProgramAddressSync([
        tokenMintA.toBuffer(),
        tokenMintB.toBuffer(),
        Buffer.from('order-book-config'),
      ], program.programId);

      const maker = users[0].keypair;

      const [orderPositionConfig] = PublicKey.findProgramAddressSync([
        users[0].keypair.publicKey.toBuffer(),
        orderBookConfig.toBuffer(),
        Buffer.from('order-position-config'),
      ], program.programId);

      const bufNum = Buffer.allocUnsafe(8);
      const num = BigInt(0);
      bufNum.writeBigUInt64LE(num, 0);
      const [orderPosition] = PublicKey.findProgramAddressSync([
        bufNum,
        orderPositionConfig.toBuffer(),
        users[0].keypair.publicKey.toBuffer(),
        Buffer.from('order-position'),
      ], program.programId);

      const [buyMarketPointer] = PublicKey.findProgramAddressSync([
        Buffer.from('buy-market-pointer'),
        orderBookConfig.toBuffer(),
        Buffer.from('market-pointer'),
      ], program.programId);

      const [sellMarketPointer] = PublicKey.findProgramAddressSync([
        Buffer.from('sell-market-pointer'),
        orderBookConfig.toBuffer(),
        Buffer.from('market-pointer'),
      ], program.programId);

      // console.log(takerTokenAccounts)

      const tx = await program.methods
        .createMarketOrder({ sell: {} }, { full: {} }, new anchor.BN(10))
        .accountsStrict({
          signer: signer.publicKey,
          orderBookConfig,
          orderPosition,
          marketPointer: sellMarketPointer,
          source: takerTokenAccounts.source,
          dest: takerTokenAccounts.dest,
          capitalSource: takerTokenAccounts.capitalA.address,
          capitalDest: takerTokenAccounts.capitalB.address,
          tokenMintSource: takerTokenAccounts.tokenMintA,
          tokenMintDest: takerTokenAccounts.tokenMintB,
          sourceProgram: TOKEN_PROGRAM_ID,
          nextPositionPointer: orderPosition,
        })
        .signers([signer])
        .rpc();

      const latestBlockHash = await provider.connection.getLatestBlockhash()
      await provider.connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: tx,
      });

      const data = await program.account.marketPointer.fetch(sellMarketPointer)
      const account = await program.provider.connection.getAccountInfo(sellMarketPointer)

      console.log(data)
      console.log(account)
      console.log([...account.data].slice(0, 96))
      console.log([...account.data].slice(96, 192))
      console.log([...account.data].slice(192, 288))
      console.log([...account.data].slice(288))



    })

    it("Fill Market Order", async () => {

      const signer = users[1].keypair;
      const maker = users[0].keypair;

      const {
        tokenMintA,
        tokenMintB,
        tokenProgramA,
        tokenProgramB,
      } = orderBookConfigAddressList[0];

      const takerTokenAccounts = users[1].vaultAccountList[0].tokenAccounts
        .find(list => list.side === 'sell');

      const makerTokenAccounts = users[0].vaultAccountList[0].tokenAccounts
        .find(list => list.side === 'bid');

      const [orderBookConfig] = PublicKey.findProgramAddressSync([
        tokenMintA.toBuffer(),
        tokenMintB.toBuffer(),
        Buffer.from('order-book-config'),
      ], program.programId);

      const [buyMarketPointer] = PublicKey.findProgramAddressSync([
        Buffer.from('buy-market-pointer'),
        orderBookConfig.toBuffer(),
        Buffer.from('market-pointer'),
      ], program.programId);

      const [sellMarketPointer] = PublicKey.findProgramAddressSync([
        Buffer.from('sell-market-pointer'),
        orderBookConfig.toBuffer(),
        Buffer.from('market-pointer'),
      ], program.programId);

      const [orderPositionConfig] = PublicKey.findProgramAddressSync([
        users[0].keypair.publicKey.toBuffer(),
        orderBookConfig.toBuffer(),
        Buffer.from('order-position-config'),
      ], program.programId);

      const bufNum = Buffer.allocUnsafe(8);
      const num = BigInt(0);
      bufNum.writeBigUInt64LE(num, 0);
      const [orderPosition] = PublicKey.findProgramAddressSync([
        bufNum,
        orderPositionConfig.toBuffer(),
        users[0].keypair.publicKey.toBuffer(),
        Buffer.from('order-position'),
      ], program.programId);

      const tx = await program.methods
        .fillMarketOrder()
        .accountsPartial({
          signer: signer.publicKey,
          orderBookConfig,
          marketPointer: sellMarketPointer,
          orderPosition,
          takerSource: takerTokenAccounts.source,
          takerDestination: takerTokenAccounts.dest,
          makerSource: makerTokenAccounts.source,
          makerDestination: makerTokenAccounts.dest,
          tokenMintA,
          tokenMintB,
          tokenProgramA,
          tokenProgramB,
        })
        .signers([signer])
        .rpc();

      const latestBlockHash = await provider.connection.getLatestBlockhash()
      await provider.connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: tx,
      });

    })

    it("Complete Market Order", async () => {

      const signer = users[1].keypair;

      const {
        tokenMintA,
        tokenMintB,
      } = orderBookConfigAddressList[0];
      const takerTokenAccounts = users[1].vaultAccountList[0].tokenAccounts
        .find(list => list.side === 'sell');

      const [orderBookConfig] = PublicKey.findProgramAddressSync([
        tokenMintA.toBuffer(),
        tokenMintB.toBuffer(),
        Buffer.from('order-book-config'),
      ], program.programId);

      const [buyMarketPointer] = PublicKey.findProgramAddressSync([
        Buffer.from('buy-market-pointer'),
        orderBookConfig.toBuffer(),
        Buffer.from('market-pointer'),
      ], program.programId);

      const [sellMarketPointer] = PublicKey.findProgramAddressSync([
        Buffer.from('sell-market-pointer'),
        orderBookConfig.toBuffer(),
        Buffer.from('market-pointer'),
      ], program.programId);

      const tx = await program.methods
        .returnExecutionMarketOrder()
        .accountsStrict({
          signer: signer.publicKey,
          orderBookConfig,
          source: takerTokenAccounts.source,
          dest: takerTokenAccounts.dest,
          capitalSource: takerTokenAccounts.capitalA.address,
          capitalDest: takerTokenAccounts.capitalB.address,
          tokenMintSource: takerTokenAccounts.tokenMintA,
          tokenMintDest: takerTokenAccounts.tokenMintB,
          sourceProgram: TOKEN_PROGRAM_ID,
          destProgram: TOKEN_PROGRAM_ID,
          marketPointer: sellMarketPointer,
        })
        .signers([signer])
        .rpc();

      const latestBlockHash = await provider.connection.getLatestBlockhash()
      await provider.connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: tx,
      });
    })

  })

  describe("Market Maker", () => {

    it("Cancel Order Position", async () => {
      const signer = users[0].keypair;

      const {
        tokenMintA,
        tokenMintB,
      } = orderBookConfigAddressList[0];

      const [orderBookConfig] = PublicKey.findProgramAddressSync([
        tokenMintA.toBuffer(),
        tokenMintB.toBuffer(),
        Buffer.from('order-book-config'),
      ], program.programId);

      const bufNum = Buffer.allocUnsafe(8);
      const num = BigInt(0);
      bufNum.writeBigUInt64LE(num, 0);
      const [orderPosition] = PublicKey.findProgramAddressSync([
        bufNum,
        signer.publicKey.toBuffer(),
        Buffer.from('order-position'),
      ], program.programId);

      const [orderPositionConfig] = PublicKey.findProgramAddressSync([
        signer.publicKey.toBuffer(),
        orderBookConfig.toBuffer(),
        Buffer.from('order-position-config'),
      ], program.programId);

      const [sellMarketPointer] = PublicKey.findProgramAddressSync([
        Buffer.from('sell-market-pointer'),
        orderBookConfig.toBuffer(),
        Buffer.from('market-pointer'),
      ], program.programId);



      const tx = await program.methods
        .cancelOrderPosition()
        .accountsStrict({
          signer: signer.publicKey,
          orderBookConfig,
          marketPointerRead: null,
          marketPointerWrite: sellMarketPointer,
          orderPosition,
          orderPositionConfig,
          prevOrderPosition: null,
          nextOrderPosition: null,
        })
        .signers([signer])
        .rpc();

      const latestBlockHash = await provider.connection.getLatestBlockhash();

      await provider.connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: tx,
      });


    });

    it("Close Order Position", async () => {

      const signer = users[0].keypair;

      const {
        tokenMintA,
        tokenMintB,
      } = orderBookConfigAddressList[0];

      const [orderBookConfig] = PublicKey.findProgramAddressSync([
        tokenMintA.toBuffer(),
        tokenMintB.toBuffer(),
        Buffer.from('order-book-config'),
      ], program.programId);

      const [orderPositionConfig] = PublicKey.findProgramAddressSync([
        signer.publicKey.toBuffer(),
        orderBookConfig.toBuffer(),
        Buffer.from('order-position-config'),
      ], program.programId);

      const bufNum = Buffer.allocUnsafe(8);
      const num = BigInt(0);
      bufNum.writeBigUInt64LE(num, 0);
      const [orderPosition] = PublicKey.findProgramAddressSync([
        bufNum,
        signer.publicKey.toBuffer(),
        Buffer.from('order-position'),
      ], program.programId);

      const tokenAccounts = users[0].vaultAccountList[0].tokenAccounts
        .find(list => list.side === 'bid');

      const tx = await program.methods
        .closeOrderPosition()
        .accountsStrict({
          signer: wallet.publicKey,
          owner: signer.publicKey,
          orderBookConfig,
          orderPosition,
          orderPositionConfig,
          capitalSource: users[0].vaultAccountList[0].capitalSourceA.address,
          capitalDest: users[0].vaultAccountList[0].capitalSourceB.address,
          source: tokenAccounts.source,
          dest: tokenAccounts.dest,
          tokenMintSource: tokenMintA,
          tokenMintDest: tokenMintB,
          sourceProgram: TOKEN_PROGRAM_ID,
          destProgram: TOKEN_PROGRAM_ID,
          systemProgram: SYSTEM_PROGRAM_ID,
        })
        .signers([wallet.payer])
        .rpc();

      const latestBlockHash = await provider.connection.getLatestBlockhash();

      await provider.connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: tx,
      });

      const orderPositionAccount = await program.account.orderPosition.fetchNullable(orderPosition);
      assert.isNull(orderPositionAccount, "Order position should no longer exist");

    })

  })


});
