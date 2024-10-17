import { MainCarousel } from "@/components/home/main-carousel";
import { Markets } from "@/components/home/markets";
import { columns } from "@/components/markets-table/columns";
import { MarketsTable } from "@/components/markets-table/data-table";
import { newMarkets, popular, topGainers } from "@/lib/markets";

export default function Home() {
  const allMarkets = newMarkets
    .concat(topGainers, popular)
    .sort((a, b) => b.volume - a.volume);

  return (
    <div className="container space-y-6">
      <MainCarousel />
      <Markets />
      <div className="container">
        <MarketsTable
          columns={columns}
          data={allMarkets}
        />
      </div>
    </div>
  );
}
