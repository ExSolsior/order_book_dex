"use client";

// import { MarketOrderBook } from "@/lib/types";
import {
  AnchorProvider,
  BN,
  Program,
  setProvider,
  web3
} from "@coral-xyz/anchor";
import {
  getAccount,
  // getAssociatedTokenAddressSync, 
  // TOKEN_PROGRAM_ID 
}
  from "@solana/spl-token";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { createContext, ReactNode, useContext, useState } from "react";
import toast from "react-hot-toast";
import {
  getBuyMarketPointerPDA,
  getOrderBookConfigPDA,
  getSellMarketPointerPDA,
  getVaultAccountPDA
} from "./pdas";
// import { createOpenLimitOrderTx } from "./transactions/open-limit-order";
import { CHRONO_IDL } from "./utils/constants";
import { confirmTx } from "./utils/helper";
import {
  PublicKey,
  SystemProgram,
  // Transaction
} from "@solana/web3.js";

export enum OrderType {
  Buy = "Buy",
  Sell = "Sell",
  Bid = "Bid",
  Ask = "Ask"
}

type Fill = {
  full: { full: object };
  partial: { partial: { targetPrice: BN } };
};

export const ProgramContext = createContext<Value | null>(null);

export const ProgramProvider = ({ children }: { children: ReactNode }) => {
  const { connection } = useConnection();
  const userWallet = useAnchorWallet();
  const [isLoading, setLoading] = useState(true);
  const [program, setProgram] = useState<typeof CHRONO_IDL | undefined>()

  const initializeProgram = () => {
    if (!userWallet || (userWallet && !isLoading)) {
      return
    }

    const provider = new AnchorProvider(connection, userWallet, {
      commitment: "confirmed",
    });

    setProvider(provider);
    setLoading(false);
    setProgram(new Program<typeof CHRONO_IDL>(CHRONO_IDL, provider))
  };

  initializeProgram()

  // need loading -> this should give no problem
  // but if a problem does still persist I will revist this
  if (isLoading) return

  // since we will have loading process, this condition is no longer ncessary
  if (!program || !userWallet)
    return (
      <ProgramContext.Provider value={null}>{children}</ProgramContext.Provider>
    );

  // Tx: Open Limit Order
  // const openLimitOrder = async ({
  //   marketOrderBook,
  //   nextPositionPointer,
  //   orderType,
  //   price,
  //   amount,
  //   nonce
  // }: {
  //   marketOrderBook: MarketOrderBook;
  //   nextPositionPointer: web3.PublicKey | null;
  //   orderType: OrderType;
  //   price: BN;
  //   amount: BN;
  //   nonce: BN;
  // }) => {
  //   try {
  //     const tx = await createOpenLimitOrderTx({
  //       marketOrderBook,
  //       connection,
  //       program,
  //       userWallet,
  //       nextPositionPointer,
  //       orderType,
  //       price,
  //       amount,
  //       nonce
  //     });

  //     await userWallet.signTransaction(tx);
  //     const txHash = await connection.sendTransaction(tx);
  //     await confirmTx(txHash, connection);
  //     toast.success("Order placed successfully!");
  //   } catch (err) {
  //     console.error(err);
  //   }
  // };

  /* Instruction: Create Trade Pair */
  const createTradePair = async (
    tokenSymbolA: string,
    tokenSymbolB: string,
    tokenMintA: web3.PublicKey,
    tokenMintB: web3.PublicKey,
    isReverse: boolean
  ) => {

    try {
      const orderBookConfig = getOrderBookConfigPDA(tokenMintA, tokenMintB);
      const buyMarketPointer = getBuyMarketPointerPDA(orderBookConfig);
      const sellMarketPointer = getSellMarketPointerPDA(orderBookConfig);

      // Derive token programs from mints
      const mintA = await connection.getAccountInfo(tokenMintA);
      const mintB = await connection.getAccountInfo(tokenMintB);

      const txHash = await program.methods
        .createTradePair(tokenSymbolA, tokenSymbolB, isReverse)
        .accountsStrict({
          authority: userWallet?.publicKey,
          orderBookConfig,
          buyMarketPointer,
          sellMarketPointer,
          tokenMintA,
          tokenMintB,
          tokenProgramA: mintA!.owner,
          tokenProgramB: mintB!.owner,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log(txHash)

      await confirmTx(txHash, connection);
      toast.success("Trade pair created successfully!");
    } catch (err) {
      console.error(err);
    }
  };

  /* Instruction: Create Market Order */
  const createMarketOrder = async (
    orderBookConfig: web3.PublicKey,
    marketPointer: web3.PublicKey,
    tokenMintSource: web3.PublicKey,
    tokenMintDest: web3.PublicKey,
    nextPositionPointer: web3.PublicKey,
    orderType: OrderType,
    fill: Fill,
    targetAmount: BN,
    isReverse: boolean
  ) => {
    try {
      // Determine source and destination based on is_reverse and orderType
      let source: web3.PublicKey;
      let dest: web3.PublicKey;

      if (
        (!isReverse && orderType === OrderType.Buy) ||
        (isReverse && orderType === OrderType.Sell)
      ) {
        // Source derived with tokenMintSource, destination derived with tokenMintDest
        source = getVaultAccountPDA(
          orderBookConfig,
          tokenMintSource,
          userWallet!.publicKey
        );
        dest = getVaultAccountPDA(
          orderBookConfig,
          tokenMintDest,
          userWallet!.publicKey
        );
      } else {
        // Source derived with tokenMintSource, destination derived with tokenMintDest
        source = getVaultAccountPDA(
          orderBookConfig,
          tokenMintDest,
          userWallet!.publicKey
        );
        dest = getVaultAccountPDA(
          orderBookConfig,
          tokenMintSource,
          userWallet!.publicKey
        );
      }

      const txHash = await program.methods
        .createMarketOrder(orderType, fill, targetAmount)
        .accountsStrict({
          signer: userWallet?.publicKey,
          orderBookConfig,
          marketPointer,
          source,
          dest,
          tokenMintSource,
          tokenMintDest,
          nextPositionPointer
        })
        .rpc();

      await confirmTx(txHash, connection);
      toast.success("Market order created successfully!");
    } catch (err) {
      console.error(err);
    }
  };

  /* Instruction: Fill Market Order */ // not final
  const fillMarketOrder = async (
    orderBookConfig: web3.PublicKey,
    marketPointer: web3.PublicKey,
    orderPosition: web3.PublicKey,
    tokenMintA: web3.PublicKey,
    tokenMintB: web3.PublicKey,
    tokenProgramA: web3.PublicKey,
    tokenProgramB: web3.PublicKey,
    makerDestination: web3.PublicKey,
    makerSource: web3.PublicKey,
    vaultA: web3.PublicKey | null,
    vaultB: web3.PublicKey | null,
    isReverse: boolean, // requred to find source and dest
    orderType: OrderType // required to find source and dest
  ) => {
    try {
      // Determine source and destination based on is_reverse and orderType
      let source: web3.PublicKey;
      let dest: web3.PublicKey;

      if (
        (!isReverse && orderType === OrderType.Sell) ||
        (isReverse && orderType === OrderType.Buy)
      ) {
        // Source derived with mintA, destination derived with mintB
        source =
          vaultA ||
          getVaultAccountPDA(
            orderBookConfig,
            tokenMintA,
            userWallet!.publicKey
          );
        dest =
          vaultB ||
          getVaultAccountPDA(
            orderBookConfig,
            tokenMintB,
            userWallet!.publicKey
          );
      } else {
        // Source derived with mintB, destination derived with mintA
        source =
          vaultB ||
          getVaultAccountPDA(
            orderBookConfig,
            tokenMintB,
            userWallet!.publicKey
          );
        dest =
          vaultA ||
          getVaultAccountPDA(
            orderBookConfig,
            tokenMintA,
            userWallet!.publicKey
          );
      }

      const txHash = await program.methods
        .fillMarketOrder()
        .accountsStrict({
          signer: userWallet?.publicKey,
          orderBookConfig,
          marketPointer,
          orderPosition,
          takerSource: source,
          makerDestination,
          makerSource,
          takerDestination: dest,
          tokenMintA,
          tokenMintB,
          tokenProgramA,
          tokenProgramB
        })
        .rpc();

      await confirmTx(txHash, connection);
      toast.success("Market order filled successfully!");
    } catch (err) {
      console.error(err);
    }
  };

  /* Instruction: Cancel Order Position */
  const cancelOrderPosition = async (
    orderBookConfig: web3.PublicKey,
    marketPointerRead: web3.PublicKey,
    marketPointerWrite: web3.PublicKey,
    orderPosition: web3.PublicKey,
    orderPositionConfig: web3.PublicKey,
    prevOrderPosition: web3.PublicKey,
    nextOrderPosition: web3.PublicKey,
    capitalDestination: web3.PublicKey,
    source: web3.PublicKey,
    tokenMint: web3.PublicKey
  ) => {
    try {
      const mint = await getAccount(connection, tokenMint);

      const txHash = await program.methods
        .cancelOrderPosition()
        .accountsStrict({
          signer: userWallet?.publicKey,
          orderBookConfig,
          marketPointerRead,
          marketPointerWrite,
          orderPosition,
          orderPositionConfig,
          prevOrderPosition,
          nextOrderPosition,
          capitalDestination,
          source,
          tokenMint,
          tokenProgram: mint.owner,
          SystemProgram: web3.SystemProgram.programId
        })
        .rpc();

      await confirmTx(txHash, connection);
      toast.success("Order position cancelled successfully!");
    } catch (err) {
      console.log(err);
    }
  };

  /* Instruction: Close Order Position */
  const closeOrderPosition = async (
    orderBookConfig: web3.PublicKey,
    orderPosition: web3.PublicKey,
    orderPositionConfig: web3.PublicKey
  ) => {
    try {
      const txHash = await program.methods
        .closeOrderPosition()
        .accountsStrict({
          signer: userWallet?.publicKey,
          owner: userWallet?.publicKey,
          orderBookConfig,
          orderPosition,
          orderPositionConfig,
          SystemProgram: web3.SystemProgram.programId
        })
        .rpc();

      await confirmTx(txHash, connection);
      toast.success("Order position closed successfully!");
    } catch (err) {
      console.error(err);
    }
  };

  /* Instruction: Return Execution Market Order */
  const returnExecutionMarketOrder = async (
    orderBookConfig: web3.PublicKey,
    marketPointer: web3.PublicKey
  ) => {
    try {
      const txHash = await program.methods
        .returnExecutionMarketOrder()
        .accountsStrict({
          signer: userWallet?.publicKey,
          orderBookConfig,
          marketPointer
        })
        .rpc();

      await confirmTx(txHash, connection);
      toast.success("Market order execution returned successfully!");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <ProgramContext.Provider
      value={{
        program,
        programId: program.programId,
        createTradePair,
        createMarketOrder,
        fillMarketOrder,
        cancelOrderPosition,
        closeOrderPosition,
        returnExecutionMarketOrder,
        // openLimitOrder
      }}
    >
      {children}
    </ProgramContext.Provider>
  );
};

interface Value {
  program: Program<typeof CHRONO_IDL>,
  programId: PublicKey,
  createTradePair: ((
    tokenSymbolA: string,
    tokenSymbolB: string,
    tokenMintA: web3.PublicKey,
    tokenMintB: web3.PublicKey,
    isReverse: boolean
  ) => Promise<void>);
  createMarketOrder: ((
    orderBookConfig: web3.PublicKey,
    marketPointer: web3.PublicKey,
    tokenMintSource: web3.PublicKey,
    tokenMintDest: web3.PublicKey,
    nextPositionPointer: web3.PublicKey,
    orderType: OrderType,
    fill: Fill,
    targetAmount: BN,
    isReverse: boolean
  ) => Promise<void>);
  fillMarketOrder: ((
    orderBookConfig: web3.PublicKey,
    marketPointer: web3.PublicKey,
    orderPosition: web3.PublicKey,
    tokenMintA: web3.PublicKey,
    tokenMintB: web3.PublicKey,
    tokenProgramA: web3.PublicKey,
    tokenProgramB: web3.PublicKey,
    makerDestination: web3.PublicKey,
    makerSource: web3.PublicKey,
    vaultA: web3.PublicKey | null,
    vaultB: web3.PublicKey | null,
    isReverse: boolean,
    orderType: OrderType
  ) => Promise<void>);
  cancelOrderPosition: ((
    orderBookConfig: web3.PublicKey,
    marketPointerRead: web3.PublicKey,
    marketPointerWrite: web3.PublicKey,
    orderPosition: web3.PublicKey,
    orderPositionConfig: web3.PublicKey,
    prevOrderPosition: web3.PublicKey,
    nextOrderPosition: web3.PublicKey,
    capitalDestination: web3.PublicKey,
    source: web3.PublicKey,
    tokenMint: web3.PublicKey
  ) => Promise<void>);
  closeOrderPosition: ((
    orderBookConfig: web3.PublicKey,
    orderPosition: web3.PublicKey,
    orderPositionConfig: web3.PublicKey
  ) => Promise<void>);
  returnExecutionMarketOrder: ((
    orderBookConfig: web3.PublicKey,
    marketPointer: web3.PublicKey
  ) => Promise<void>);
  // openLimitOrder: (({
  //   marketOrderBook,
  //   nextPositionPointer,
  //   orderType,
  //   price,
  //   amount,
  //   nonce
  // }: {
  //   marketOrderBook: MarketOrderBook;
  //   nextPositionPointer: web3.PublicKey | null;
  //   orderType: OrderType;
  //   price: BN;
  //   amount: BN;
  //   nonce: BN;
  // }) => Promise<void>);
}

export const useProgramContext = () => {
  const context = useContext(ProgramContext);
  return context;
};
