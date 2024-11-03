"use client";

import { Button } from "@/components/ui/button";
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
import { Avatar, AvatarImage } from "../ui/avatar";
import { Input } from "../ui/input";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { MessageV0, PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { useContext } from "react";
import { ProgramContext } from "@/program/ProgramProvider";

// structure to get image data is incorrect, currently not handling that
// so using dummy structure
export default function LimitOrder({
  market,
  type
}: {
  market: Market;
  type: "buy" | "sell";
}) {
  const { marketId } = market.orderBook.accounts;
  const { symbolA, symbolB, isReverse } = market.orderBook.marketDetails;
  const userWallet = useAnchorWallet();
  const { program } = useContext(ProgramContext)!;

  // Dummy log to prevent lint error for `type` until functionality is implemented
  console.log(`Trade type: ${type}`);

  const formSchema = z.object({
    price: z.number(),
    quantity: z.number(),
    orderValue: z.number()
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      price: Number(market.orderBook.marketData.lastPrice.toString()),
      quantity: 0,
      orderValue: 0
    }
  });

  function onSubmit(values: z.infer<typeof formSchema>) {

    console.log("LOG::", values);
    {
      /* TODO: Implement functionality */
      // book config
      // signer address
      // next position pointer = null
      // order type
      // price
      // amount
      // nonce
    }

    const params = new URLSearchParams({
      "book_config": marketId.toString(),
      signer: userWallet!.publicKey.toString(),
      "order_type": "bid",
      // next_position_pointer: optional value?
      // this will come from market pointer state
      // which is currently not implemented yet
      price: (10).toString(),
      amount: (1).toString(),
      nonce: (0).toString(),
    });

    // url should come from a config file
    const base = new URL("http://127.0.0.1:8000");
    const path = new URL("/api/open_limit_order?" + params.toString(), base.toString());


    fetch(path)
      .then((data) => {

        // need to check data is valid and handle appropiately
        // also need to handle when multiple version transactions...
        // well not for open limit order but for execute market order
        return data.json();
      })
      .then((data) => {

        let vMessage = new MessageV0({

          addressTableLookups: data.message[1].addressTableLookups.slice(1).map((data: any) => {
            return {
              accountKey: data.accountKey,
              readonlyIndexes: data.readonlyIndexes,
              writableIndexes: data.writeableIndexes,
            }
          }),

          compiledInstructions: data.message[1].instructions.slice(1).map((data: any) => {
            return {
              accountKeyIndexes: data.accounts.slice(1),
              data: new Uint8Array(data.data.slice(1)),
              programIdIndex: data.programIdIndex,
            }
          }),

          header: data.message[1].header,
          recentBlockhash: new PublicKey(Buffer.from(data.message[1].recentBlockhash)).toString(),
          staticAccountKeys: data.message[1].accountKeys.slice(1).map((data: any) => {
            return new PublicKey(Buffer.from(data));
          }),
        })

        let vTransaction = new VersionedTransaction(vMessage);
        return userWallet?.signTransaction(vTransaction);
      })
      .then((signedTransaction) => {

        // why does the wallet provider popup twice?
        return program!.provider!.sendAndConfirm!(signedTransaction as VersionedTransaction)
      })
      .then((data) => {

        // how to handle this? what data will this be?
        // can do anything with it since it fails atm
        // but apparently it returns a string?
        // signature possibly?
        console.log(data)
      })
      .catch(err => {
        console.log(err)
      })
  }


  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-3"
      >
        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price</FormLabel>
              <FormControl>
                <div className="flex gap-1">
                  <Input
                    className="text-right text-xl font-mono font-semibold"
                    {...field}
                  />
                  <Avatar>
                    <AvatarImage
                      src="https://s2.coinmarketcap.com/static/img/coins/64x64/825.png"
                      alt={isReverse ? symbolA : symbolB}
                      className="rounded-full w-6 h-6 self-center"
                    />
                  </Avatar>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
                      src={market.image}
                      alt={isReverse ? symbolB : symbolA}
                      className="rounded-full w-6 h-6 self-center"
                    />
                  </Avatar>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="orderValue"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Order Value</FormLabel>
              <FormControl>
                <div className="flex gap-1">
                  <Input
                    className="text-right text-xl font-mono font-semibold"
                    {...field}
                  />
                  <Avatar>
                    <AvatarImage
                      src="https://s2.coinmarketcap.com/static/img/coins/64x64/825.png"
                      alt={isReverse ? symbolA : symbolB}
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
