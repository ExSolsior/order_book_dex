import { createContext, useContext, useMemo, ReactNode } from "react";
import { 
  PublicKey, 
  SystemProgram, 
} from '@solana/web3.js';
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { getAccount, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";
import toast from "react-hot-toast";

import {
  getProgram,
  getOrderBookConfig,
  getBuyMarketPointer,
  getSellMarketPointer,
  getVaultAccount,
  getOrderPositionConfig,
  getOrderPosition
} from "../program";

import { confirmTx } from "../utils/helper";

enum OrderType {
	Buy = "Buy",
	Sell = "Sell",
	Bid = "Bid",
	Ask = "Ask"
	
}

type Fill = {
  full : {full: object}, 
  partial: {partial: {targetPrice: BN}}
}

export const AppContext = createContext<Value | null>(null);

export const AppProvider = ({ children }: {children: ReactNode}) => {

  // Get provider
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  
  const program = useMemo(() => {
    if (connection) {
      return getProgram(connection, wallet);
    }
  }, [connection, wallet]);

  if(!program) return;

  /* Instruction: Create Trade Pair */
  const createTradePair = async (
    tokenMintA: PublicKey, 
    tokenMintB: PublicKey, 
    isReverse: boolean,
    ) => {
    try {
      const orderBookConfig = await getOrderBookConfig(tokenMintA, tokenMintB);
      const buyMarketPointer = await getBuyMarketPointer(orderBookConfig);
      const sellMarketPointer = await getSellMarketPointer(orderBookConfig);

			// Derive token programs from mints
			const mintA = await getAccount(connection, tokenMintA);
			const mintB = await getAccount(connection, tokenMintB);

			const txHash = await program.methods
				.createTradePair(isReverse)
				.accountsStrict({
				authority: wallet?.publicKey, 
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
      console.error(err)
    }
	}

	/* Instruction: Create Vault Accounts */
	const createVaultAccounts = async (
		orderBookConfig: PublicKey, 
		tokenMintA: PublicKey, 
		tokenMintB: PublicKey) => {
		try {
			const vaultA = await getVaultAccount(orderBookConfig, tokenMintA, wallet!.publicKey);
			const vaultB = await getVaultAccount(orderBookConfig, tokenMintB, wallet!.publicKey);
			
			// Derive token programs from mints
			const mintA = await getAccount(connection, tokenMintA);
			const mintB = await getAccount(connection, tokenMintB);

			const txHash = await program.methods
				.createVaultAccounts()
				.accountsStrict({
				signer: wallet?.publicKey,
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
	}

	/* Instruction: Create Order Position Config */
	const createOrderPositionConfig = async (orderBookConfig: PublicKey) => {
		try {
			const orderPositionConfig = await getOrderPositionConfig(wallet!.publicKey, orderBookConfig);

			const txHash = await program.methods
				.createOrderPositionConfig()
				.accountsStrict({
					signer: wallet?.publicKey,
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
	}

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
    vaultB : PublicKey | null,
		isReverse: boolean,      // requred to find source and dest
    orderType: OrderType,   // required to find source and dest
		
  ) => {
    try {
      
			// Get nonce from order position config if it doesn't exist
      const resolvedNonce = nonce;
      // || await program.account.orderPositionConfig.fetch(clientOrderPositionConfig).then((acc: { nonce: number; }) => acc.nonce);
      
			const orderPosition = await getOrderPosition(clientOrderPositionConfig, new BN(resolvedNonce), wallet!.publicKey);

			// Determine source, destination and capital source based on is_reverse and orderType
			let resolvedSource: PublicKey;
			let resolvedDest: PublicKey;
			let capitalSource: PublicKey;

			if ((!isReverse && orderType === OrderType.Bid) || (isReverse && orderType === OrderType.Ask)) {
				// Capital Source derived with mint A
				capitalSource = getAssociatedTokenAddressSync(tokenMintA, wallet!.publicKey);

				// Source derived with mintA, destination derived with mintB
				resolvedSource = vaultA || await getVaultAccount(orderBookConfig, tokenMintA, wallet!.publicKey);
				resolvedDest = vaultB || await getVaultAccount(orderBookConfig, tokenMintB, wallet!.publicKey);
			} else {
				// Capital Source derived with mint B
				capitalSource = getAssociatedTokenAddressSync(tokenMintB, wallet!.publicKey);

				// Source derived with mintB, destination derived with mintA
				resolvedSource = vaultB || await getVaultAccount(orderBookConfig, tokenMintB, wallet!.publicKey);
				resolvedDest = vaultA || await getVaultAccount(orderBookConfig, tokenMintA, wallet!.publicKey);
			}

      const txHash = await program.methods
				.createOrderPosition(orderType, price, amount)
        .accountsStrict({
          signer: wallet?.publicKey,
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
      console.error(err)
    }
  }

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
    isReverse: boolean,
	) => {
			try {
				
        // Determine source and destination based on is_reverse and orderType
        let source: PublicKey;
        let dest: PublicKey;

        if ((!isReverse && orderType === OrderType.Buy) || (isReverse && orderType === OrderType.Sell)) {
          // Source derived with tokenMintSource, destination derived with tokenMintDest
          source = await getVaultAccount(orderBookConfig, tokenMintSource, wallet!.publicKey);
          dest = await getVaultAccount(orderBookConfig, tokenMintDest, wallet!.publicKey);
        } else {
          // Source derived with tokenMintSource, destination derived with tokenMintDest
          source = await getVaultAccount(orderBookConfig, tokenMintDest, wallet!.publicKey);
          dest = await getVaultAccount(orderBookConfig, tokenMintSource, wallet!.publicKey);
        }

        const txHash = await program.methods
          .createMarketOrder(orderType, fill, targetAmount)
          .accountsStrict({
              signer: wallet?.publicKey,
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
	}

	/* Instruction: Fill Market Order */ // not final
	const fillMarketOrder = async (
    orderBookConfig: PublicKey,
    marketPointer : PublicKey,
    orderPosition: PublicKey,
    tokenMintA: PublicKey,
    tokenMintB: PublicKey,
    tokenProgramA: PublicKey,
    tokenProgramB: PublicKey,
    makerDestination: PublicKey,
    makerSource: PublicKey,
    vaultA: PublicKey | null,
    vaultB : PublicKey | null,
    isReverse: boolean,      // requred to find source and dest
    orderType: OrderType,   // required to find source and dest
  ) => {
    try {
			// Determine source and destination based on is_reverse and orderType
			let source: PublicKey;
			let dest: PublicKey;

			if ((!isReverse && orderType === OrderType.Sell) || (isReverse && orderType === OrderType.Buy)) {
				// Source derived with mintA, destination derived with mintB
				source = vaultA || await getVaultAccount(orderBookConfig, tokenMintA, wallet!.publicKey);
				dest = vaultB || await getVaultAccount(orderBookConfig, tokenMintB, wallet!.publicKey);
			} else {
				// Source derived with mintB, destination derived with mintA
				source = vaultB || await getVaultAccount(orderBookConfig, tokenMintB, wallet!.publicKey);
				dest = vaultA || await getVaultAccount(orderBookConfig, tokenMintA, wallet!.publicKey);
			}

      const txHash = await program.methods.fillMarketOrder()
        .accountsStrict({
          signer: wallet?.publicKey,
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
      console.error(err)
    }
  }

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
          signer: wallet?.publicKey,
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
      console.error(err)
    }
  }

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
          signer: wallet?.publicKey,
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
      console.log(err)
    }
  }

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
          signer: wallet?.publicKey,
          owner: wallet?.publicKey,
          orderBookConfig,
          orderPosition,
          orderPositionConfig,
          systemProgram: SystemProgram.programId
        })
        .rpc();

      await confirmTx(txHash, connection);
      toast.success("Order position closed successfully!");
    } catch (err) {
      console.error(err)
    }
  }

	/* Instruction: Return Execution Market Order */
  const returnExecutionMarketOrder = async (
    orderBookConfig: PublicKey,
    marketPointer: PublicKey
  ) => {
    try {
      const txHash = await program.methods
				.returnExecutionMarketOrder()
        .accountsStrict({
          signer: wallet?.publicKey,
          orderBookConfig,
          marketPointer
        })
        .rpc();

      await confirmTx(txHash, connection);
      toast.success("Market order execution returned successfully!");
    } catch (err) {
      console.error(err)
    }
  }

	return (
		<AppContext.Provider
			value={{
				connected: wallet?.publicKey ? true : false,
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
		</AppContext.Provider>
	);
  
};

interface Value {
  connected: boolean;
  createTradePair: (tokenMintA: PublicKey, tokenMintB: PublicKey, isReverse: boolean) => Promise<void>;
  createVaultAccounts: (orderBookConfig: PublicKey, tokenMintA: PublicKey, tokenMintB: PublicKey) => Promise<void>;
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



export const useAppContext = () => {
	return useContext(AppContext);
};

  
    