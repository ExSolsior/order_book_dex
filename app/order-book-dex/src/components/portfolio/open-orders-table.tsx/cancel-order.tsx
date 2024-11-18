"use client";

import React, { useContext } from "react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
// import { AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion"
import { displayValue } from "@/program/utils/helper";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { TransactionOrder } from "@/lib/types";
import { MessageV0, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { ProgramContext } from "@/program/ProgramProvider";

interface CancelOrderProps {
  bookConfig: string;
  orderType: string;
  orderPosition: string
  orderDetails: OrderDetails
}

interface OrderDetails {
  tokenA: string;
  tokenB: string;
  pair: string;
  type: string;
  amount: bigint;
  price: bigint;
  value: bigint;
  decimalsA: number;
  decimalsB: number,
  isReverse: boolean;
}

const API_ENDPOINT = process.env.NEXT_PUBLIC_API_ENDPOINT;

const CancelOrder: React.FC<CancelOrderProps> = ({ bookConfig, orderType, orderPosition, orderDetails }) => {
  const [isOpen, setIsOpen] = useState(false)
  const userWallet = useAnchorWallet();
  const { program } = useContext(ProgramContext)!;

  const handleCancelOrder = () => {
    
    console.log(`Canceling order with ID: ${orderPosition}`);

    // order_book_config: Pubkey,
    // signer: Pubkey,
    // order_position: Pubkey,
    // order_type: Order,

    const params = new URLSearchParams({
      "book_config": bookConfig,
      "signer": userWallet!.publicKey.toBase58(),
      "order_type": orderType,
      "order_position": orderPosition
    });

    console.log("Book Config: ", bookConfig);
    console.log("Signer: ", userWallet!.publicKey.toBase58());
    console.log("Order Type: ", orderType);
    console.log("Order Position: ", orderPosition);

    const base = new URL("./api/", API_ENDPOINT);
    const path = new URL("./cancel_limit_order?" + params.toString(), base);

    console.log(base);
    console.log(path);

    fetch(path)
      .then((data) => {
        // check is okay
        // if not then throw error
        console.log(data);
        return data.json();
      })
      .then((data) => {
        const vMessage = new MessageV0({

          addressTableLookups: data.message[1].addressTableLookups.slice(1).map((data: TransactionOrder) => {
            return {
              accountKey: data.accountKey,
              readonlyIndexes: data.readonlyIndexes,
              writableIndexes: data.writeableIndexes,
            }
          }),

          compiledInstructions: data.message[1].instructions.slice(1).map((data: TransactionOrder) => {
            return {
              accountKeyIndexes: data.accounts.slice(1),
              data: new Uint8Array(data.data.slice(1)),
              programIdIndex: data.programIdIndex,
            }
          }),

          header: data.message[1].header,
          recentBlockhash: new PublicKey(Buffer.from(data.message[1].recentBlockhash)).toString(),
          staticAccountKeys: data.message[1].accountKeys.slice(1).map((data: number[]) => {
            return new PublicKey(Buffer.from(data));
          }),
        })

        const vTransaction = new VersionedTransaction(vMessage);
        return userWallet?.signTransaction(vTransaction);
      })
      .then((signedTransaction) => {

        // why does the wallet provider popup twice?
        return program!.provider!.sendAndConfirm!(signedTransaction as VersionedTransaction)
      })
      .then((data) => {
        // is a txSig, what to do with it?
        console.log(data)
      })
      .catch(err => {
        console.log(err)
      })
   
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="bg-red-600 text-white font-bold transition duration-200 ease-in-out transform hover:scale-105 hover:bg-red-700"
        >
          Cancel
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-[425px] rounded-lg overflow-hidden border-0 shadow-lg bg-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
        <AlertDialogHeader className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6 rounded-t-lg shadow-md">
            <AlertDialogTitle className="text-2xl font-bold">Confirm Order Cancellation</AlertDialogTitle>
            <AlertDialogDescription className="text-red-100 mt-2 text xs">
            Are you sure you want to cancel this order? <br /> This action cannot be <strong>undone</strong>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="bg-white p-6">
          <div className="grid gap-4 py-4 text-black">
            <div className="grid grid-cols-2 items-center gap-4 flex justify-between items-center ">
              <span className="font-medium">Pair:</span>
              {/* <AvatarImage
                  src=
                  alt=
                /> */}
              <span className="font-semibold">{orderDetails.pair}</span>
            </div>
            <div className="grid grid-cols-2 items-center gap-4">
              <span className="font-medium ">Type:</span>
              <span className={`font-mono font-bold ${orderDetails.type === "bid" ? "text-green-500" : "text-red-500"}`}>
                {orderDetails.type === "bid" ? "BID" : "ASK"}</span>
            </div>
            <div className="grid grid-cols-2 items-center gap-4">
              <span className="font-medium">Amount:</span>
              <span className="font-semibold font-mono">{displayValue(orderDetails.amount, orderDetails.isReverse ? orderDetails.decimalsA : orderDetails.decimalsB)} {!orderDetails.isReverse ? orderDetails.tokenB : orderDetails.tokenA}</span>
            </div>
            <div className="grid grid-cols-2 items-center gap-4">
              <span className="font-medium">Price:</span>
              <span className="font-semibold font-mono">{displayValue(orderDetails.price, orderDetails.isReverse ? orderDetails.decimalsB : orderDetails.decimalsA)} {!orderDetails.isReverse ? orderDetails.tokenA : orderDetails.tokenB}</span>
            </div>
            <div className="grid grid-cols-2 items-center gap-4">
              <span className="font-medium">Value (USD):</span>
              <span className="font-semibold font-mono">${orderDetails.value} </span>
            </div>
          </div>
        </div>
        
        <AlertDialogFooter className="p-4 rounded-b-lg">
          <AlertDialogCancel>Keep Order</AlertDialogCancel>
          <AlertDialogAction 
          className="bg-red-600 text-destructive-foreground hover:bg-destructive/90"
          onClick={handleCancelOrder} >
            Cancel Order
          </AlertDialogAction>
        </AlertDialogFooter>
        </motion.div>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default CancelOrder;