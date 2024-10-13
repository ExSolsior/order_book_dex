export type Market = {
  marketId: string;
  tokenA: string;
  tokenB: string;
  price: number;
  change: number;
  volume: number;
  image: string;
};

const newMarkets: Market[] = [
  {
    marketId: "123e4567-e89b-12d3-a456-426614174000",
    tokenA: "MOODENG",
    tokenB: "WETH",
    price: 0.00009218,
    change: -34.05,
    volume: 9400000,
    image:
      "https://dd.dexscreener.com/ds-data/tokens/ethereum/0x28561b8a2360f463011c16b6cc0b0cbef8dbbcad.png?size=lg&key=f7c99e"
  },
  {
    marketId: "123e4567-e89b-12d3-a456-426614174001",
    tokenA: "MSTR",
    tokenB: "WETH",
    price: 1.45,
    change: 10.19,
    volume: 9300000,
    image:
      "https://dd.dexscreener.com/ds-data/tokens/ethereum/0x42069026eac8eee0fd9b5f7adfa4f6e6d69a2b39.png?size=lg&key=b6d36d"
  },
  {
    marketId: "123e4567-e89b-12d3-a456-426614174002",
    tokenA: "SPX",
    tokenB: "WETH",
    price: 0.9214,
    change: 11.77,
    volume: 18600000,
    image:
      "https://dd.dexscreener.com/ds-data/ads/asset/3a89e457f38f0f75b342657956f7d01180d10388.png"
  },
  {
    marketId: "123e4567-e89b-12d3-a456-426614174003",
    tokenA: "JOE",
    tokenB: "WETH",
    price: 0.04789,
    change: 7.8,
    volume: 1500000,
    image:
      "https://dd.dexscreener.com/ds-data/tokens/ethereum/0x76e222b07c53d28b89b0bac18602810fc22b49a8.png?size=lg&key=3e80ea"
  },
  {
    marketId: "123e4567-e89b-12d3-a456-426614174004",
    tokenA: "KLAUS",
    tokenB: "WETH",
    price: 0.006096,
    change: -14.64,
    volume: 473000,
    image:
      "https://dd.dexscreener.com/ds-data/tokens/ethereum/0xb612bfc5ce2fb1337bd29f5af24ca85dbb181ce2.png?size=lg&key=b93958"
  }
];

const topGainers: Market[] = [
  {
    marketId: "123e4567-e89b-12d3-a456-426614174005",
    tokenA: "BLK",
    tokenB: "WETH",
    price: 0.1882,
    change: 713,
    volume: 4600000,
    image:
      "https://dd.dexscreener.com/ds-data/tokens/ethereum/0x420690b6158ba4a4c9d8d6a4355308d7a54c625a.png?size=lg&key=a1172d"
  },
  {
    marketId: "123e4567-e89b-12d3-a456-426614174006",
    tokenA: "GOU",
    tokenB: "USDT",
    price: 0.0157,
    change: 109,
    volume: 3100000,
    image:
      "https://dd.dexscreener.com/ds-data/tokens/ethereum/0xed89fc0f41d8be2c98b13b7e3cd3e876d73f1d30.png?size=lg&key=b35bdc"
  },
  {
    marketId: "123e4567-e89b-12d3-a456-426614174007",
    tokenA: "APX",
    tokenB: "WETH",
    price: 0.00004819,
    change: 1320,
    volume: 192000,
    image:
      "https://dd.dexscreener.com/ds-data/tokens/ethereum/0xef0cfe238c1014eef8de8e05331269710de39f64.png?size=lg&key=42021c"
  },
  {
    marketId: "123e4567-e89b-12d3-a456-426614174008",
    tokenA: "XRP",
    tokenB: "WETH",
    price: 0.03179,
    change: 71.04,
    volume: 417000,
    image:
      "https://dd.dexscreener.com/ds-data/tokens/ethereum/0x07e0edf8ce600fb51d44f51e3348d77d67f298ae.png?size=lg&key=ef4e37"
  },
  {
    marketId: "123e4567-e89b-12d3-a456-426614174009",
    tokenA: "GME",
    tokenB: "USDT",
    price: 0.00002276,
    change: 23.33,
    volume: 544000,
    image:
      "https://dd.dexscreener.com/ds-data/tokens/ethereum/0xc56c7a0eaa804f854b536a5f3d5f49d2ec4b12b8.png?size=lg&key=743497"
  }
];

const popular: Market[] = [
  {
    marketId: "123e4567-e89b-12d3-a456-426614174010",
    tokenA: "WETH",
    tokenB: "USDT",
    price: 2454.77,
    change: -0.32,
    volume: 710970000,
    image:
      "https://assets.coingecko.com/coins/images/2518/small/weth.png?1628852295"
  },
  {
    marketId: "123e4567-e89b-12d3-a456-426614174011",
    tokenA: "WTBC",
    tokenB: "WETH",
    price: 62437.0,
    change: -1.37,
    volume: 45090000,
    image:
      "https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png?1548822744"
  },
  {
    marketId: "123e4567-e89b-12d3-a456-426614174012",
    tokenA: "WSTETH",
    tokenB: "USDT",
    price: 2900.43,
    change: -0.57,
    volume: 25650000,
    image:
      "https://assets.coingecko.com/coins/images/18834/small/wstETH.png?1633565443"
  },
  {
    marketId: "123e4567-e89b-12d3-a456-426614174013",
    tokenA: "DAI",
    tokenB: "USDT",
    price: 1.0,
    change: -0.02,
    volume: 23470000,
    image:
      "https://assets.coingecko.com/coins/images/9956/small/4943.png?1636636734"
  },
  {
    marketId: "123e4567-e89b-12d3-a456-426614174014",
    tokenA: "MSTR",
    tokenB: "WETH",
    price: 1.205,
    change: -18.05,
    volume: 9300000,
    image: "https://s2.coinmarketcap.com/static/img/coins/64x64/33356.png"
  }
];

export { newMarkets, popular, topGainers };
