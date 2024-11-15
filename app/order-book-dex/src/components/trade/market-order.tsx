"use client";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Market } from "../../program/utils/useTransaction";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Input } from "../ui/input";
import { Avatar, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { MessageHeader, MessageV0, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { useContext } from "react";
import { ProgramContext } from "@/program/ProgramProvider";
import { TransactionOrder } from "@/lib/types";

const API_ENDPOINT = process.env.NEXT_PUBLIC_API_ENDPOINT;

export default function MarketOrder({
  market,
  type
}: {
  market: Market;
  type: "buy" | "sell" | "ask" | "bid";
}) {
  const { marketId } = market!.orderBook!.accounts;
  const userWallet = useAnchorWallet();
  const { symbolA, symbolB, isReverse } = market!.orderBook!.marketDetails;
  const { program } = useContext(ProgramContext)!;

  const formSchema = z.object({
    quantity: z.string().refine((val) => !Number.isNaN(parseInt(val, 10)), {
      message: "Expected number, received a string"
    })
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: '0'
    }
  });

  function onSubmit(values: z.infer<typeof formSchema>) {

    const params = new URLSearchParams({
      "book_config": marketId.toString(),
      "signer": userWallet!.publicKey.toString(),
      "positionConfig": market!.orderBook!.accounts!.userPositionConfig!.toString(),
      "order_type": type,
      "target_amount": values.quantity,
    });

    const base = new URL("/api", API_ENDPOINT);
    const path = new URL("./execute_market_order?" + params.toString(), base.toString());

    fetch(path)
      .then((data) => data.json())
      .then((msg) => {
        console.log("msg", msg)

        interface TransactionList {
          message: {
            addressTableLookups: TransactionOrder[],
            instructions: TransactionOrder[],
            recentBlockhash: number[],
            header: MessageHeader
            accountKeys: number[][],
          }[]
        }
        const v0TransactionList = msg.map((data: TransactionList) => {
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

        return v0TransactionList.map((signedTransaction: VersionedTransaction) => {
          program!.provider!.sendAndConfirm!(signedTransaction)
        })

      })
      .then((data) => data.forEach((txSig: string) => console.log(txSig)))
      .catch((err) => console.log(err))
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-3"
      >
        <div className="flex justify-between pr-4">
          <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Average Price
          </span>
          <span className="text-sm font-semibold text-right">
            {/* how to compute the average price? or should compute the average price? */}
            0.00 {!isReverse ? symbolA : symbolB}
          </span>
        </div>
        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity</FormLabel>
              <FormControl>
                <div className="flex gap-1">
                  <Input
                    className="text-right text-xl font-mono font-semibold"
                    {...field}
                  />
                  <Avatar>
                    <AvatarImage
                      src={
                        type === "buy"
                          ? "https://s2.coinmarketcap.com/static/img/coins/64x64/825.png"
                          : market.image
                      }
                      alt={type === "buy" ? isReverse ? symbolA : symbolB : isReverse ? symbolA : symbolB}
                      className="rounded-full w-6 h-6 self-center"
                    />
                  </Avatar>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full font-bold text-lg"
        >
          Swap
        </Button>
      </form>
    </Form>
  );
}
