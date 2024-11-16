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
import { useContext, useState } from "react";
import { ProgramContext } from "@/program/ProgramProvider";
import { TransactionOrder } from "@/lib/types";
import { displayValue } from "@/program/utils/helper";
import { SelectValue } from "@radix-ui/react-select";
import { MarketContext } from "../provider/market-provider";
import { UserBalance } from "@/program/utils/useMarkets";

const API_ENDPOINT = process.env.NEXT_PUBLIC_API_ENDPOINT;

export default function MarketOrder({
  market,
  type
}: {
  market: Market;
  type: "buy" | "sell" | "ask" | "bid";
}) {
  const [total, setTotal] = useState<bigint>(BigInt(0));
  const { marketId } = market!.orderBook!.accounts;
  const userWallet = useAnchorWallet();
  const { symbolA, symbolB, decimalsA, decimalsB, isReverse } = market!.orderBook!.marketDetails;
  const { lastPrice } = market!.orderBook.marketData;
  const { userBalance } = useContext(MarketContext);
  const balance = userBalance.find((user: UserBalance) => user.marketId.toString() === marketId.toString());
  const availableBalance = type === 'buy'
    ? !isReverse ? balance!.capitalAAmount : balance!.capitalBAmount
    : !isReverse ? balance!.capitalBAmount : balance!.capitalAAmount;
  const { program } = useContext(ProgramContext)!;

  const formSchema = z.object({

    quantity: z.string().refine((val) => {
      const decimals = !isReverse ? decimalsA : decimalsB
      const total = lastPrice * BigInt(convertNum(val, decimals)) / BigInt(10 ** decimals)

      return type === 'buy'
        ? total < availableBalance
        : BigInt(convertNum(val, !isReverse ? decimalsB : decimalsA)) < availableBalance
    }, {

      message: `Expected value to be less than available balance: ${displayValue(availableBalance,
        type === 'buy'
          ? !isReverse ? decimalsA : decimalsB
          : !isReverse ? decimalsB : decimalsA
      )}`
    })
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: '0.0'
    },
    mode: "onChange"
  });

  function onSubmit(values: z.infer<typeof formSchema>) {

    // need to validate total against the avialable balance
    // need to implement correct decimals
    if ((BigInt(convertNum(values.quantity, 10)) > availableBalance) || total > availableBalance) {
      return
    }

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

  const convertNum = (value: string, decimals: number) => {
    const list = value.split(".");

    if (list.length > 2) {
      return '0'
    }

    if (list.length === 1) {
      return list[0].concat("0".repeat(decimals));
    }

    if (list[0] === '0') {
      return list[1].substring(0, decimals).padEnd(decimals, "0").replace(/^0+/, '');
    }

    return [list[0].replace(/^0+/, ''), list[1].substring(0, decimals).padEnd(decimals, "0")].join("");
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-3"
      >
        <div className="flex justify-between pr-4">
          <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {/* should be average cost? or average price? or average value? */}
            Average Cost
          </span>
          <span className="text-sm font-semibold text-right">
            {/* not sure if the correct decimals is being passsed in? */}
            {displayValue(total, !isReverse ? decimalsA : decimalsB)} {!isReverse ? symbolA : symbolB}
          </span>
        </div>
        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => {
            // NOTE:: too many nested if statements, needs to have a better layout
            // also computing the total is just using a simple vaulation formula
            // it would be more accurate to match against the limit orders on the order book
            // but the limit orders can change very rapidly
            // so need to find a happy medium... weighted average?
            // maybe increase and decrase value with arrow keys?
            // how to add an listener for arrow keys???

            const isNumbers = field.value.split('').filter((value: string) => value !== '.')
              .every((value: string) => /^\d+(\.\d+)?$/.test(value))

            const isDecimals = field.value.includes(".")

            if (!((isNumbers && isDecimals) || isNumbers)) {
              form.setValue("quantity", field.value
                .split('')
                .filter((value: string) => /^\d+(\.\d+)?$/.test(value))
                .join('')
                .trim())
            } else {

              if (field.value.length === 0) {
                form.setValue("quantity", '0')
              }

              if (field.value.length != 1 && field.value[0] === '0' && field.value[1] !== '.') {
                form.setValue("quantity", field.value.slice(1))
              }

              const decimals = !isReverse ? decimalsA : decimalsB
              setTotal(lastPrice * BigInt(convertNum(field.value, decimals)) / BigInt(10 ** decimals))

              if (field.value[0] === '.') {
                form.setValue("quantity", '0' + field.value)

              }

              if (field.value.includes('.')) {
                const list = field.value.split('.')
                if (list.length > 2) {
                  form.setValue("quantity", field.value.substring(0, field.value.length - 1))
                }

                if (list[1].length > (!isReverse ? decimalsB : decimalsA)) {
                  form.setValue("quantity", field.value.substring(0, field.value.length - 1))
                }

              }
            }


            return (
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
            )
          }

          }
        />

        <Button
          type="submit"
          className="w-full font-bold text-lg"
        >
          Trade
        </Button>
      </form>
    </Form>
  );
}
