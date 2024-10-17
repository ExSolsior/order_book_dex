import { columns } from "@/components/portfolio/past-order-table/columns";
import { PastOrdersTable } from "@/components/portfolio/past-order-table/data-table";

export type PastOrder = {
  marketId: string;
  tokenA: string;
  tokenB: string;
  tokenAImage: string;
  tokenBImage: string;
  price: number;
  amount: number;
  usd_value: number;
  type: "buy" | "sell";
  status: "cancelled" | "filled";
  updatedAt: number;
};

const samplePastOrders: PastOrder[] = [
  {
    marketId: "123e4567-e89b-12d3-a456-426614174009",
    tokenA: "GME",
    tokenB: "USDT",
    tokenAImage:
      "https://dd.dexscreener.com/ds-data/tokens/ethereum/0xc56c7a0eaa804f854b536a5f3d5f49d2ec4b12b8.png?size=lg&key=743497",
    tokenBImage: "https://s2.coinmarketcap.com/static/img/coins/64x64/825.png",
    price: 0.00003131,
    amount: 41698886,
    usd_value: 1311.15,
    type: "buy",
    status: "filled",
    updatedAt: 1729041404
  }
];

export function PastOrders() {
  return (
    <div>
      <h2 className="scroll-m-20 pb-2 text-3xl font-semibold tracking-tight first:mt-0">
        Past Orders
      </h2>
      <PastOrdersTable
        columns={columns}
        data={samplePastOrders}
      />
    </div>
  );
}
