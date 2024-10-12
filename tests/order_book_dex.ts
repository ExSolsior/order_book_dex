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
  createAccount,
  mintToChecked,
  getMinimumBalanceForRentExemptAccount,
} from "@solana/spl-token";
import { publicKey } from "@coral-xyz/anchor/dist/cjs/utils";
import { SYSTEM_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/native/system";

describe("order_book_dex", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const {
    Keypair,
    PublicKey,
    Transaction,
    TransactionInstruction,
    SystemProgram,
    sendAndConfirmTransaction,
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
                    source: !is_reverse ? vaultA : vaultB,
                    dest: !is_reverse ? vaultB : vaultA
                  },
                  {
                    side: "ask",
                    capitalSource: !is_reverse ? capitalSourceB : capitalSourceA,
                    source: !is_reverse ? vaultB : vaultA,
                    dest: !is_reverse ? vaultA : vaultB
                  }
                ],
                vaultA, vaultB, capitalSourceA, capitalSourceB
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

  it("Create Vault Accounts", async () => {

    const tx = await program.methods
      .createVaultAccounts()
      .accounts({
        signer: users[0].keypair.publicKey,
        orderBookConfig: orderBookConfigAddressList[0].publicKey,
        tokenMintA: orderBookConfigAddressList[0].tokenMintA,
        tokenMintB: orderBookConfigAddressList[0].tokenMintB,

        // vaultA: user[0].vaultAccountList[0].vaultA,
        // vaultB: user[0].vaultAccountList[0].vaultB,

        tokenProgramA: orderBookConfigAddressList[0].tokenProgramA,
        tokenProgramB: orderBookConfigAddressList[0].tokenProgramB,

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

    const signer = users[0].keypair;

    const {
      tokenMintA,
      tokenMintB,
      tokenProgramA,
      tokenProgramB,
    } = orderBookConfigAddressList[0];
    const tokenAccounts = users[0].vaultAccountList[0].tokenAccounts
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
      signer.publicKey.toBuffer(),
      // 'market-maker-order-position'
      Buffer.from('order-position'),
    ], program.programId);


    const tx = await program.methods
      // this should be bid instead of buy. will fix later
      .createOrderPosition({ buy: {} }, new anchor.BN(100), new anchor.BN(100))
      .accountsStrict({
        signer: signer.publicKey,
        orderBookConfig,
        orderPositionConfig,
        orderPosition,
        tokenMintA,
        tokenMintB,
        capitalSource: tokenAccounts.capitalSource.address,
        source: tokenAccounts.source,
        destination: tokenAccounts.dest,
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

  it("Open Order Position -> Market Maker", async () => {

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
      // 'market-maker-order-position'
      Buffer.from('order-position'),
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
      .openOrderPosition()
      .accountsPartial({
        signer: signer.publicKey,
        orderBookConfig,
        marketPointerRead: null,
        marketPointerWrite: bidMarketPointer,
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

  it("Cancel Order Position -> Market Maker", async () => {
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
  
    const [bidMarketPointer] = PublicKey.findProgramAddressSync([
      Buffer.from('bid-market-pointer'),
      orderBookConfig.toBuffer(),
      Buffer.from('market-pointer'),
    ], program.programId);
  
    const tokenAccounts = users[0].vaultAccountList[0].tokenAccounts
      .find(list => list.side === 'bid');
  
    const tx = await program.methods
      .cancelOrderPosition()
      .accountsStrict({
        signer: signer.publicKey,
        orderBookConfig,
        marketPointerRead: null,
        marketPointerWrite: bidMarketPointer,
        orderPosition,
        orderPositionConfig,
        prevOrderPosition: null,
        nextOrderPosition: null,
        capitalDestination: tokenAccounts.capitalSource.address,
        source: tokenAccounts.source,
        tokenMint: tokenMintA,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([signer])
      .rpc();
  
    const latestBlockHash = await provider.connection.getLatestBlockhash();
  
    await provider.connection.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: tx,
    });
  
    const orderPositionAccount = await program.account.orderPosition.fetchNullable(orderPosition);
    assert.isNull(orderPositionAccount, "Order position should no longer exist");
  });

});
