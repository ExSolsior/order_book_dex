import { PortfolioOrders } from "@/components/portfolio/portfolio-orders";
import { PortfolioHeader } from "./header";
import { PortfolioOpenOrders } from "./open-orders";
import { PortfolioSummary } from "./summary";

export default function PortfolioPage() {
  return (
    <div className="container space-y-6 py-8">
      <PortfolioHeader />
      <PortfolioSummary />
      <PortfolioOpenOrders />
      <PortfolioOrders />
    </div>
  );
}
