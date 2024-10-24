"use client";

import { newMarkets, popular, topGainers } from "@/lib/markets";
import { Avatar, AvatarImage } from "@radix-ui/react-avatar";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Table, TableBody, TableCell, TableRow } from "../ui/table";

export function Markets() {
  return (
    <div className="container">
      <h2 className="scroll-m-20 pb-2 text-3xl font-semibold tracking-tight first:mt-0">
        Markets
      </h2>
      <div className="flex justify-between">
        <NewMarkets />
        <TopGainers />
        <Popular />
      </div>
    </div>
  );
}

const NewMarkets = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>New</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableBody>
            {newMarkets.map((market) => (
              <Row
                key={market.tokenA + market.tokenB}
                {...market}
              />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

const TopGainers = () => {
  const sorted = topGainers.sort((a, b) => b.change - a.change);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Gainers</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableBody>
            {sorted.map((market) => (
              <Row
                key={market.tokenA + market.tokenB}
                {...market}
              />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

const Popular = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Popular</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableBody>
            {popular.map((market) => (
              <Row
                key={market.tokenA + market.tokenB}
                {...market}
              />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

const Row = (market: (typeof newMarkets)[0]) => {
  const router = useRouter();
  return (
    <TableRow
      key={market.tokenA + market.tokenB}
      className="cursor-pointer"
      onClick={() => {
        router.push(`/trade/${market.marketId}`);
      }}
    >
      <TableCell>
        <div className="font-semibold flex gap-1">
          <Avatar>
            <AvatarImage
              src={market.image}
              alt={market.tokenA}
              className="w-5 h-5 rounded-full"
            />
          </Avatar>
          {market.tokenA} / {market.tokenB}
        </div>
      </TableCell>
      <TableCell className="font-semibold text-right">
        {market.price.toLocaleString("en-US", {
          style: "currency",
          currency: "USD"
        })}
      </TableCell>
      <TableCell
        className={`font-semibold text-right ${market.change < 0 ? "text-red-500" : "text-green-500"}`}
      >
        {market.change}%
      </TableCell>
    </TableRow>
  );
};
