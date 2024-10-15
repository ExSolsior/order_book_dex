import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PortfolioSummary() {
  // fetch this data from backend
  const totalValue = 7000;
  const dailyChange = 2.5;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-muted-foreground">Total Value</p>
            <p className="text-2xl font-bold">${totalValue.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">24h Change</p>
            <p className={`text-xl font-semibold ${dailyChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {dailyChange >= 0 ? '+' : ''}{dailyChange}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}