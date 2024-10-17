'use client'

import React from 'react';
import dynamic from 'next/dynamic';
import { candles } from '../../lib/candles';

const CandlestickChart = dynamic(() => import('../../components/CandleStickChart'), { ssr: false });

const data = candles;

const Trade2Page: React.FC = () => {
  return (
    <div>
      <h1>Trade Page</h1>
      <CandlestickChart data={data} />
    </div>
  );
};

export default Trade2Page;

