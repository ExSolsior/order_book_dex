import { AnchorProvider, BN, Program, setProvider } from "@coral-xyz/anchor";
import { getAccount, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { createContext, ReactNode, useContext, useMemo } from "react";
import toast from "react-hot-toast";
import { confirmTx, getProgram } from "./utils/helper";

import {
  getBuyMarketPointerPDA,
  getOrderBookConfigPDA,
  getOrderPositionConfigPDA,
  getOrderPositionPDA,
  getSellMarketPointerPDA,
  getVaultAccountPDA
} from "./pdas";

enum OrderType {
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
  // Get provider
  const { connection } = useConnection();
  const userWallet = useAnchorWallet();

  const program = useMemo(() => {
    if (connection) {
      return getProgram(connection, userWallet!);
    }
  }, [connection, userWallet]);

  if (!program) return;

  /* Instruction: Create Trade Pair */
  const createTradePair = async (
    tokenMintA: PublicKey,
    tokenMintB: PublicKey,
    isReverse: boolean
  ) => {
    try {
      const orderBookConfig = getOrderBookConfigPDA(tokenMintA, tokenMintB);
      const buyMarketPointer = getBuyMarketPointerPDA(orderBookConfig);
      const sellMarketPointer = getSellMarketPointerPDA(orderBookConfig);

      // Derive token programs from mints
      const mintA = await getAccount(connection, tokenMintA);
      const mintB = await getAccount(connection, tokenMintB);

      const txHash = await program.methods
        .createTradePair(isReverse)
        .accountsStrict({
          authority: userWallet?.publicKey,
          orderBookConfig,
          buyMarketPointer,
          sellMarketPointer,
          tokenMintA,
          tokenMintB,
          tokenProgramA: mintA.owner,
          tokenProgramB: mintB.owner,
          systemProgram: SystemProgram.programId
        })
        .rpc();

      await confirmTx(txHash, connection);
      toast.success("Trade pair created successfully!");
    } catch (err) {
      console.error(err);
    }
  };

  /* Instruction: Create Vault Accounts */
  const createVaultAccounts = async (
    orderBookConfig: PublicKey,
    tokenMintA: PublicKey,
    tokenMintB: PublicKey
  ) => {
    try {
      const vaultA = getVaultAccountPDA(
        orderBookConfig,
        tokenMintA,
        userWallet!.publicKey
      );
      const vaultB = getVaultAccountPDA(
        orderBookConfig,
        tokenMintB,
        userWallet!.publicKey
      );

      // Derive token programs from mints
      const mintA = await getAccount(connection, tokenMintA);
      const mintB = await getAccount(connection, tokenMintB);

      const txHash = await program.methods
        .createVaultAccounts()
        .accountsStrict({
          signer: userWallet?.publicKey,
          orderBookConfig,
          tokenMintA,
          tokenMintB,
          vaultA,
          vaultB,
          tokenProgramA: mintA.owner,
          tokenProgramB: mintB.owner,
          systemProgram: SystemProgram.programId
        })
        .rpc();

      await confirmTx(txHash, connection);
      toast.success("Vault accounts created successfully!");
    } catch (err) {
      console.error(err);
    }
  };

  /* Instruction: Create Order Position Config */
  const createOrderPositionConfig = async (orderBookConfig: PublicKey) => {
    try {
      const orderPositionConfig = getOrderPositionConfigPDA(
        userWallet!.publicKey,
        orderBookConfig
      );

      const txHash = await program.methods
        .createOrderPositionConfig()
        .accountsStrict({
          signer: userWallet?.publicKey,
          orderBookConfig,
          orderPositionConfig,
          systemProgram: SystemProgram.programId
        })
        .rpc();

      await confirmTx(txHash, connection);
      toast.success("Order position config created successfully!");
    } catch (err) {
      console.error(err);
    }
  };

  /* Instruction: Create Order Position */
  const createOrderPosition = async (
    orderBookConfig: PublicKey,
    clientOrderPositionConfig: PublicKey,
    tokenMintA: PublicKey,
    tokenMintB: PublicKey,
    tokenProgramA: PublicKey,
    tokenProgramB: PublicKey,
    price: BN,
    amount: BN,
    nonce: number, // need to put null later
    vaultA: PublicKey | null,
    vaultB: PublicKey | null,
    isReverse: boolean, // requred to find source and dest
    orderType: OrderType // required to find source and dest
  ) => {
    try {
      // Get nonce from order position config if it doesn't exist
      const resolvedNonce = nonce;
      // || await program.account.orderPositionConfig.fetch(clientOrderPositionConfig).then((acc: { nonce: number; }) => acc.nonce);

      const orderPosition = getOrderPositionPDA(
        new BN(resolvedNonce),
        userWallet!.publicKey
      );

      // Determine source, destination and capital source based on is_reverse and orderType
      let resolvedSource: PublicKey;
      let resolvedDest: PublicKey;
      let capitalSource: PublicKey;

      if (
        (!isReverse && orderType === OrderType.Bid) ||
        (isReverse && orderType === OrderType.Ask)
      ) {
        // Capital Source derived with mint A
        capitalSource = getAssociatedTokenAddressSync(
          tokenMintA,
          userWallet!.publicKey
        );

        // Source derived with mintA, destination derived with mintB
        resolvedSource =
          vaultA ||
          getVaultAccountPDA(
            orderBookConfig,
            tokenMintA,
            userWallet!.publicKey
          );
        resolvedDest =
          vaultB ||
          getVaultAccountPDA(
            orderBookConfig,
            tokenMintB,
            userWallet!.publicKey
          );
      } else {
        // Capital Source derived with mint B
        capitalSource = getAssociatedTokenAddressSync(
          tokenMintB,
          userWallet!.publicKey
        );

        // Source derived with mintB, destination derived with mintA
        resolvedSource =
          vaultB ||
          getVaultAccountPDA(
            orderBookConfig,
            tokenMintB,
            userWallet!.publicKey
          );
        resolvedDest =
          vaultA ||
          getVaultAccountPDA(
            orderBookConfig,
            tokenMintA,
            userWallet!.publicKey
          );
      }

      const txHash = await program.methods
        .createOrderPosition(orderType, price, amount)
        .accountsStrict({
          signer: userWallet?.publicKey,
          orderBookConfig,
          orderPositionConfig: clientOrderPositionConfig,
          orderPosition,
          tokenMintA,
          tokenMintB,
          capitalSource,
          source: resolvedSource,
          destination: resolvedDest,
          tokenProgramA,
          tokenProgramB,
          systemProgram: SystemProgram.programId
        })
        .rpc();

      await confirmTx(txHash, connection);
      toast.success("Order position created successfully!");
    } catch (err) {
      console.error(err);
    }
  };

  /* Instruction: Create Market Order */
  const createMarketOrder = async (
    orderBookConfig: PublicKey,
    marketPointer: PublicKey,
    tokenMintSource: PublicKey,
    tokenMintDest: PublicKey,
    nextPositionPointer: PublicKey,
    orderType: OrderType,
    fill: Fill,
    targetAmount: BN,
    isReverse: boolean
  ) => {
    try {
      // Determine source and destination based on is_reverse and orderType
      let source: PublicKey;
      let dest: PublicKey;

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
    orderBookConfig: PublicKey,
    marketPointer: PublicKey,
    orderPosition: PublicKey,
    tokenMintA: PublicKey,
    tokenMintB: PublicKey,
    tokenProgramA: PublicKey,
    tokenProgramB: PublicKey,
    makerDestination: PublicKey,
    makerSource: PublicKey,
    vaultA: PublicKey | null,
    vaultB: PublicKey | null,
    isReverse: boolean, // requred to find source and dest
    orderType: OrderType // required to find source and dest
  ) => {
    try {
      // Determine source and destination based on is_reverse and orderType
      let source: PublicKey;
      let dest: PublicKey;

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

  /* Instruction: Open Order Position */
  const openOrderPosition = async (
    orderBookConfig: PublicKey,
    marketPointerRead: PublicKey,
    marketPointerWrite: PublicKey,
    orderPosition: PublicKey,
    orderPositionConfig: PublicKey,
    prevOrderPosition: PublicKey,
    nextOrderPosition: PublicKey,
    nextPositionPointer: PublicKey
  ) => {
    try {
      const txHash = await program.methods
        .openOrderPosition()
        .accountsStrict({
          signer: userWallet?.publicKey,
          orderBookConfig,
          marketPointerRead,
          marketPointerWrite,
          orderPosition,
          orderPositionConfig,
          prevOrderPosition,
          nextOrderPosition,
          nextPositionPointer
        })
        .rpc();

      await confirmTx(txHash, connection);
      toast.success("Order position opened successfully!");
    } catch (err) {
      console.error(err);
    }
  };

  /* Instruction: Cancel Order Position */
  const cancelOrderPosition = async (
    orderBookConfig: PublicKey,
    marketPointerRead: PublicKey,
    marketPointerWrite: PublicKey,
    orderPosition: PublicKey,
    orderPositionConfig: PublicKey,
    prevOrderPosition: PublicKey,
    nextOrderPosition: PublicKey,
    capitalDestination: PublicKey,
    source: PublicKey,
    tokenMint: PublicKey
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
          systemProgram: SystemProgram.programId
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
    orderBookConfig: PublicKey,
    orderPosition: PublicKey,
    orderPositionConfig: PublicKey
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
          systemProgram: SystemProgram.programId
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
    orderBookConfig: PublicKey,
    marketPointer: PublicKey
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
        connected: userWallet?.publicKey ? true : false,
        createTradePair,
        createVaultAccounts,
        createOrderPositionConfig,
        createOrderPosition,
        createMarketOrder,
        fillMarketOrder,
        openOrderPosition,
        cancelOrderPosition,
        closeOrderPosition,
        returnExecutionMarketOrder
      }}
    >
      {children}
    </ProgramContext.Provider>
  );
};

interface Value {
  connected: boolean;
  createTradePair: (
    tokenMintA: PublicKey,
    tokenMintB: PublicKey,
    isReverse: boolean
  ) => Promise<void>;
  createVaultAccounts: (
    orderBookConfig: PublicKey,
    tokenMintA: PublicKey,
    tokenMintB: PublicKey
  ) => Promise<void>;
  createOrderPositionConfig: (orderBookConfig: PublicKey) => Promise<void>;
  createOrderPosition: (
    orderBookConfig: PublicKey,
    clientOrderPositionConfig: PublicKey,
    tokenMintA: PublicKey,
    tokenMintB: PublicKey,
    tokenProgramA: PublicKey,
    tokenProgramB: PublicKey,
    price: BN,
    amount: BN,
    nonce: number, // need to put null later
    vaultA: PublicKey | null,
    vaultB: PublicKey | null,
    isReverse: boolean,
    orderType: OrderType
  ) => Promise<void>;
  createMarketOrder: (
    orderBookConfig: PublicKey,
    marketPointer: PublicKey,
    tokenMintSource: PublicKey,
    tokenMintDest: PublicKey,
    nextPositionPointer: PublicKey,
    orderType: OrderType,
    fill: Fill,
    targetAmount: BN,
    isReverse: boolean
  ) => Promise<void>;
  fillMarketOrder: (
    orderBookConfig: PublicKey,
    marketPointer: PublicKey,
    orderPosition: PublicKey,
    tokenMintA: PublicKey,
    tokenMintB: PublicKey,
    tokenProgramA: PublicKey,
    tokenProgramB: PublicKey,
    makerDestination: PublicKey,
    makerSource: PublicKey,
    vaultA: PublicKey | null,
    vaultB: PublicKey | null,
    isReverse: boolean,
    orderType: OrderType
  ) => Promise<void>;
  openOrderPosition: (
    orderBookConfig: PublicKey,
    marketPointerRead: PublicKey,
    marketPointerWrite: PublicKey,
    orderPosition: PublicKey,
    orderPositionConfig: PublicKey,
    prevOrderPosition: PublicKey,
    nextOrderPosition: PublicKey,
    nextPositionPointer: PublicKey
  ) => Promise<void>;
  cancelOrderPosition: (
    orderBookConfig: PublicKey,
    marketPointerRead: PublicKey,
    marketPointerWrite: PublicKey,
    orderPosition: PublicKey,
    orderPositionConfig: PublicKey,
    prevOrderPosition: PublicKey,
    nextOrderPosition: PublicKey,
    capitalDestination: PublicKey,
    source: PublicKey,
    tokenMint: PublicKey
  ) => Promise<void>;
  closeOrderPosition: (
    orderBookConfig: PublicKey,
    orderPosition: PublicKey,
    orderPositionConfig: PublicKey
  ) => Promise<void>;
  returnExecutionMarketOrder: (
    orderBookConfig: PublicKey,
    marketPointer: PublicKey
  ) => Promise<void>;
}

export const useProgramContext = () => {
  return useContext(ProgramContext);
};
