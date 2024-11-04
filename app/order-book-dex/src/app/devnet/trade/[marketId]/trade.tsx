import OpenNewWindowButton from "@/components/open-new-window-button";
import OrderDetails from "@/components/trade/order-details";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Market } from "../../../../program/utils/useTransaction";

const SOON_EXPLORER_URL = "https://explorer.devnet.soo.network";

// need to hande link for OpenNewWindowButton
export default function Trade({ market }: { market: Market }) {
  const { symbolA, symbolB, isReverse } = market.orderBook.marketDetails;

  return (
    <div className="flex flex-col w-1/4 border-2 border-t-0">
      <div className="flex justify-center items-center gap-1 border-b-2 py-2">
        <h3 className="scroll-m-20 text-xl font-semibold">
          <span className="mr-1">{isReverse ? symbolB : symbolA}</span>
          <OpenNewWindowButton
            link={`${SOON_EXPLORER_URL}/account/7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs`}
          />
          {" /"} <span>{isReverse ? symbolA : symbolB}</span>
          <OpenNewWindowButton
            link={`${SOON_EXPLORER_URL}/account/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`}
          />
        </h3>
      </div>

      <Tabs defaultValue="buy">
        <TabsList className="bg-transparent w-full py-9 px-0">

          <TabsTrigger
            value="buy"
            className="rounded-none grow data-[state=active]:bg-green-950 border-b-2 data-[state=active]:border-b-green-700 py-5"
          >
            <span className="text-green-500 text-lg font-semibold tracking-tight">
              Buy
            </span>
          </TabsTrigger>

          <TabsTrigger
            value="sell"
            className="rounded-none grow data-[state=active]:bg-red-950 border-b-2 data-[state=active]:border-b-red-700 py-5"
          >
            <span className="text-red-500 text-lg font-semibold tracking-tight">
              Sell
            </span>
          </TabsTrigger>

        </TabsList>

        <TabsContent value="buy">
          <OrderDetails
            market={market}
            type="buy"
          />
        </TabsContent>

        <TabsContent value="sell">
          <OrderDetails
            market={market}
            type="sell"
          />
        </TabsContent>

      </Tabs>
    </div>
  );
}
