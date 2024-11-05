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
import { Market, MarketOrderState } from "../../program/utils/useTransaction";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Avatar, AvatarImage } from "../ui/avatar";
import { Input } from "../ui/input";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { MessageV0, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { useContext } from "react";
import { ProgramContext } from "@/program/ProgramProvider";

// need to add better validations
const formSchema = z.object({
  price: z.string().refine((val) => {
    console.log(val, val.length)
    return !Number.isNaN(parseInt(val, 10))
  }, {
    message: "Expected number, received a string"
  }),
  quantity: z.string().refine((val) => !Number.isNaN(parseInt(val, 10)), {
    message: "Expected number, received a string"
  }),
  orderValue: z.string().refine((val) => !Number.isNaN(parseInt(val, 10)), {
    message: "Expected number, received a string"
  })
});

// structure to get image data is incorrect, currently not handling that
// so using dummy structure
export default function LimitOrder({
  market,
  marketOrder,
  type
}: {
  market: Market;
  marketOrder: MarketOrderState,
  type: "buy" | "sell" | "ask" | "bid";
}) {
  const { marketId } = market.orderBook.accounts;
  const { symbolA, symbolB, isReverse } = market.orderBook.marketDetails;
  const userWallet = useAnchorWallet();
  const { program } = useContext(ProgramContext)!;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      price: market.orderBook.marketData.lastPrice.toString(),
      quantity: '0',
      orderValue: '0'
    }
  });

  function onSubmit(values: z.infer<typeof formSchema>) {

    const params = new URLSearchParams({
      "book_config": marketId.toString(),
      "signer": userWallet!.publicKey.toString(),
      "order_type": type,
      "price": values.price,
      "amount": values.quantity,

      // need to send correct nonce
      // because is not being handled on backend atm
      "nonce": market.user.positionConfigNonce.toString(),
    });

    if (type === "bid" && marketOrder.bidNextPointer !== null && marketOrder.bidNextPointer !== undefined) {
      params.append("next_position_pointer", marketOrder.bidNextPointer.toString());
    }

    if (type === "ask" && marketOrder.askNextPointer !== null && marketOrder.askNextPointer !== undefined) {
      params.append("next_position_pointer", marketOrder.askNextPointer.toString());
    }

    // url should come from a config file
    const base = new URL("http://127.0.0.1:8000/api/");
    const path = new URL("./open_limit_order?" + params.toString(), base.toString());


    fetch(path)
      .then((data) => {

        // need to check data is valid and handle appropiately
        // also need to handle when multiple version transactions...
        // well not for open limit order but for execute market order
        return data.json();
      })
      .then((data) => {

        interface LimitOrderTransaction {
          accountKey: number,
          readonlyIndexes: number,
          writeableIndexes: number,
          accounts: number[],
          data: number[],
          programIdIndex: number,
        }

        const vMessage = new MessageV0({

          addressTableLookups: data.message[1].addressTableLookups.slice(1).map((data: LimitOrderTransaction) => {
            return {
              accountKey: data.accountKey,
              readonlyIndexes: data.readonlyIndexes,
              writableIndexes: data.writeableIndexes,
            }
          }),

          compiledInstructions: data.message[1].instructions.slice(1).map((data: LimitOrderTransaction) => {
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
