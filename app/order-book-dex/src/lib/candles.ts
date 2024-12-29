export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

const candles: Candle[] = [
  {
    time: 1734352200,
    open: 4000,
    high: 4300,
    low: 3800,
    close: 4200
  },
  {
    time: 1734354000,
    open: 4200,
    high: 4210,
    low: 3800,
    close: 3800
  },
  {
    time: 1734355800,
    open: 3700,
    high: 3800,
    low: 3600,
    close: 3800
  },
  {
    time: 1734357600,
    open: 3800,
    high: 4050.25,
    low: 3758.69,
    close: 3950.49
  },
  {
    time: 1734359400,
    open: 3950.49,
    high: 3950.49,
    low: 3600,
    close: 3758
  },
  {
    time: 1734361200,
    open: 3758,
    high: 3899.32,
    low: 3750,
    close: 3850
  },

  {
    time: 1734363000,
    open: 3850,
    high: 4020,
    low: 3850,
    close: 4000
  },

];

export { candles };
