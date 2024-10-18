import {
  ColorType,
  createChart,
  CrosshairMode,
  IChartApi,
  Time
} from "lightweight-charts";
import React, { useEffect, useRef, useState } from "react";
import { Candle } from "../lib/candles";

interface CandlestickChartProps {
  data: Candle[];
}

interface HoveredCandle {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
}

const CandlestickChart: React.FC<CandlestickChartProps> = ({ data }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [hoveredCandle, setHoveredCandle] = useState<
    HoveredCandle | null | undefined
  >(undefined);

  useEffect(() => {
    if (chartContainerRef.current) {
      const chartOptions = {
        layout: {
          textColor: "white",
          background: { type: ColorType.Solid, color: "#141414" } // Changed to a softer black
        },
        grid: {
          vertLines: { color: "rgba(70, 70, 70, 0.5)" },
          horzLines: { color: "rgba(70, 70, 70, 0.5)" }
        },
        crosshair: {
          mode: CrosshairMode.Normal
        },
        localization: {
          timeFormatter: (time: number) => {
            const date = new Date(time * 1000);
            const dateFormatter = new Intl.DateTimeFormat(navigator.language, {
              hour: "numeric",
              minute: "numeric",
              second: "numeric",
              day: "numeric",
              month: "short",
              year: "2-digit"
            });
            return dateFormatter.format(date);
          }
        }
      };

      const priceScaleOptions = {
        borderColor: "#71649C"
      };

      const timeScaleOptions = {
        borderColor: "#71649C",
        rightOffset: 10,
        timeVisible: true
      };

      const candleStickSeriesOptions = {
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderVisible: false,
        wickUpColor: "#22c55e",
        wickDownColor: "#ef4444"
      };

      chartRef.current = createChart(chartContainerRef.current, chartOptions);
      const chart = chartRef.current;

      const candlestickSeries = chart.addCandlestickSeries(
        candleStickSeriesOptions
      );
      chart.priceScale("right").applyOptions(priceScaleOptions);
      chart.timeScale().applyOptions(timeScaleOptions);

      const formattedData = data.map((candle) => ({
        open: parseFloat(candle.open.toFixed(2)),
        high: parseFloat(candle.high.toFixed(2)),
        low: parseFloat(candle.low.toFixed(2)),
        close: parseFloat(candle.close.toFixed(2)),
        time: (candle.time / 1000) as Time // Convert to seconds and cast to Time
      }));
      candlestickSeries.setData(formattedData);

      chart.timeScale().fitContent();

      const getLastBar = (series: typeof candlestickSeries) => {
        return series.dataByIndex(Number.MAX_SAFE_INTEGER, -1);
      };

      // Display the OHLCV of the candle that is hovered
      chart.subscribeCrosshairMove((param) => {
        const validCrosshairPoint = !(
          param === undefined ||
          param.time === undefined ||
          param.point?.x === undefined ||
          param.point?.y === undefined ||
          param.point.x < 0 ||
          param.point.y < 0
        );
        const bar = validCrosshairPoint
          ? param.seriesData.get(candlestickSeries)
          : getLastBar(candlestickSeries);

        const jsonData = JSON.stringify(bar);
        const parsedData: HoveredCandle = JSON.parse(jsonData);

        setHoveredCandle(parsedData);
      });

      // Resize the chart when the window is resized
      const handleResize = () => {
        chart.applyOptions({
          width: chartContainerRef.current?.clientWidth
        });
      };
      window.addEventListener("resize", handleResize);

      return () => {
        chart.remove();
        window.removeEventListener("resize", handleResize);
      };
    }
  }, [data]);

  const candleColor = (candle: HoveredCandle) => {
    if (candle.close > candle.open) {
      return "green";
    } else {
      return "red";
    }
  };

  return (
    <div
      ref={chartContainerRef}
      className="flex grow relative"
    >
      {hoveredCandle && (
        <div className="absolute z-10 mt-2 ml-2 text-foreground font-mono flex gap-2 text-sm">
          <div>
            O:
            <span className={`text-${candleColor(hoveredCandle)}-500`}>
              {hoveredCandle?.open}
            </span>
          </div>
          <div>
            H:
            <span className={`text-${candleColor(hoveredCandle)}-500`}>
              {hoveredCandle?.high}
            </span>
          </div>
          <div>
            L:
            <span className={`text-${candleColor(hoveredCandle)}-500`}>
              {hoveredCandle?.low}
            </span>
          </div>
          <div>
            C:
            <span className={`text-${candleColor(hoveredCandle)}-500`}>
              {hoveredCandle?.close}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandlestickChart;
