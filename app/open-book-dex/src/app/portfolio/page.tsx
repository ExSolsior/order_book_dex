import { PortfolioSummary } from "@/components/portfolio/portfolio-summary";
import { PortfolioAssets } from "@/components/portfolio/portfolio-assets";
import { PortfolioOrders } from "@/components/portfolio/portfolio-orders";

export default function PortfolioPage() {
    return (
      <div className="container space-y-6 py-8">
        <h1 className="text-3xl font-bold">Portfolio</h1>
        <PortfolioSummary />
        <PortfolioAssets />
        <PortfolioOrders />
      </div>
    );
  }