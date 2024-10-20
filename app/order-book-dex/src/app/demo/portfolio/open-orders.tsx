import { columns } from "@/components/portfolio/open-orders-table.tsx/columns";
import { OpenOrdersTable } from "@/components/portfolio/open-orders-table.tsx/data-table";

export type OpenOrder = {
  marketId: string;
  tokenA: string;
  tokenB: string;
  tokenAImage: string;
  tokenBImage: string;
  price: number;
  amount: number;
  usd_value: number;
  type: "buy" | "sell";
  status: "open" | "partial";
  createdAt: number;
};

const sampleOpenOrders: OpenOrder[] = [
  {
    marketId: "123e4567-e89b-12d3-a456-426614174010",
    tokenA: "WETH",
    tokenB: "USDT",
    tokenAImage: "https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png",
    tokenBImage: "https://s2.coinmarketcap.com/static/img/coins/64x64/825.png",
    price: 2400,
    amount: 1.6,
    usd_value: 3840,
    type: "buy",
    status: "open",
    createdAt: 1729051404
  },
  {
    marketId: "123e4567-e89b-12d3-a456-426614174000",
    tokenA: "GOU",
    tokenB: "WETH",
    tokenAImage:
      "https://dd.dexscreener.com/ds-data/tokens/ethereum/0xed89fc0f41d8be2c98b13b7e3cd3e876d73f1d30.png?size=lg&key=b35bdc",
    tokenBImage: "https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png",
    price: 0.000004915,
    amount: 57724,
    usd_value: 741.72,
    type: "sell",
    status: "partial",
    createdAt: 1729008600
  }
];

export function PortfolioOpenOrders() {
  return (
    <div>
      <h2 className="scroll-m-20 pb-2 text-3xl font-semibold tracking-tight first:mt-0">
        Open Orders
      </h2>
      <OpenOrdersTable
        columns={columns}
        data={sampleOpenOrders}
      />
    </div>
  );
}
