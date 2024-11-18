import { columns } from "@/components/portfolio/open-orders-table.tsx/columns";
import { OpenOrdersTable } from "@/components/portfolio/open-orders-table.tsx/data-table";
import { MarketContext } from "@/components/provider/market-provider";
import { useContext } from "react";

// export type OpenOrderV1 = {
//   marketId: string;
//   tokenA: string;
//   tokenB: string;
//   tokenAImage: string;
//   tokenBImage: string;
//   price: number;
//   fill_amount: number;
//   amount: number;
//   usd_value: number;
//   type: "bid" | "ask";
//   status: "open" | "partial";
//   createdAt: number;
// };

// const sampleOpenOrders: OpenOrderV1[] = [
//   {
//     marketId: "123e4567-e89b-12d3-a456-426614174010",
//     tokenA: "WETH",
//     tokenB: "USDT",
//     tokenAImage: "https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png",
//     tokenBImage: "https://s2.coinmarketcap.com/static/img/coins/64x64/825.png",
//     price: 2400,
//     amount: 1.6,
//     fill_amount: 0,
//     usd_value: 3840,
//     type: "bid",
//     status: "open",
//     createdAt: 1729051404
//   },
//   {
//     marketId: "123e4567-e89b-12d3-a456-426614174000",
//     tokenA: "GOU",
//     tokenB: "WETH",
//     tokenAImage:
//       "https://dd.dexscreener.com/ds-data/tokens/ethereum/0xed89fc0f41d8be2c98b13b7e3cd3e876d73f1d30.png?size=lg&key=b35bdc",
//     tokenBImage: "https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png",
//     price: 0.000004915,
//     amount: 57724,
//     fill_amount: 0,
//     usd_value: 741.72,
//     type: "ask",
//     status: "partial",
//     createdAt: 1729008600
//   }
// ];

// // Transform sampleOpenOrders to match OrderData type
// const transformedOpenOrders: OrderData[] = sampleOpenOrders.map(order => ({
//   positionId: order.marketId, // Assuming positionId maps to marketId
//   tokenA: order.tokenA,
//   tokenB: order.tokenB,
//   ticker: `${order.tokenA}/${order.tokenB}`, // Example transformation
//   orderType: order.type,
//   fillAmount: order.fill_amount, 
//   amount: order.amount,
//   price: order.price,
//   value: order.usd_value,
//   valueUSD: order.usd_value,
//   usd_value: BigInt(order.usd_value),
//   status: order.status,
//   createdAt: order.createdAt,
// }));

export function PortfolioOpenOrders() {
  const { openLimitOrders } = useContext(MarketContext);

  console.log("Open Limit Orders: ", openLimitOrders);
  
  return (
    <div>
      <h2 className="scroll-m-20 pb-2 text-3xl font-semibold tracking-tight first:mt-0">
        Open Orders
      </h2>
      <OpenOrdersTable
        columns={columns}
        data={openLimitOrders} // use the fetched openLimitOrders
      />
    </div>
  );
}
