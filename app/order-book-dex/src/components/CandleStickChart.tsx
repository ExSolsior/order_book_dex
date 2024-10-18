import {
  ColorType,
  createChart,
  CrosshairMode,
  IChartApi
} from "lightweight-charts";
import React, { useEffect, useRef } from "react";
import { Candle } from "../lib/candles";

interface CandlestickChartProps {
  data: Candle[];
}

const CandlestickChart: React.FC<CandlestickChartProps> = ({ data }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (chartContainerRef.current) {
      const chartOptions = {
        layout: {
          textColor: "white",
          background: { type: "solid" as ColorType, color: "#141414" } // Changed to a softer black
        },
        grid: {
          vertLines: { color: "rgba(70, 70, 70, 0.5)" },
          horzLines: { color: "rgba(70, 70, 70, 0.5)" }
        },
        crosshair: {
          mode: CrosshairMode.Normal
        }
      };

      chartRef.current = createChart(chartContainerRef.current, chartOptions);
      const chart = chartRef.current;

      const candlestickSeries = chart.addCandlestickSeries({
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderVisible: false,
        wickUpColor: "#22c55e",
        wickDownColor: "#ef4444"
      });

      candlestickSeries.setData(data);

      chart.timeScale().fitContent();

      return () => {
        chart.remove();
      };
    }
  }, [data]);

  return (
    <div
      ref={chartContainerRef}
      className="flex grow"
    />
  );
};

export default CandlestickChart;
