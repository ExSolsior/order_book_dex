import { Card, CardContent, CardTitle } from "@/components/ui/card";

export function PortfolioSummary() {
  const netValue = 25000;
  const points = 4330;
  const change = 13.54;

  return (
    <div className="flex gap-4">
      <Card className="flex items-center grow">
        <CardContent className="py-4">
          <CardTitle className="font-medium text-lg text-muted-foreground">
            Net value
          </CardTitle>
          <span className="text-xl font-bold font-mono tracking-tight">
            ${netValue.toLocaleString()}
          </span>
        </CardContent>
      </Card>

      <Card className="flex items-center grow">
        <CardContent className="py-4">
          <CardTitle className="font-medium text-lg text-muted-foreground">
            24h Change
          </CardTitle>
          <span
            className={`text-xl font-bold font-mono tracking-tight ${
              change < 0 ? "text-red-500" : "text-green-500"
            }`}
          >
            {change > 0 ? "+" : ""}
            {change}%
          </span>
        </CardContent>
      </Card>

      <Card className="flex items-center grow">
        <CardContent className="pb-0">
          <CardTitle className="font-medium text-lg text-muted-foreground">
            Season 1 Points
          </CardTitle>
          <span className="text-xl font-bold font-mono tracking-tight text-amber-300">
            {points.toLocaleString()}
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
