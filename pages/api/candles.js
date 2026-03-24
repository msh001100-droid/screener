import { demoCandles } from '../../lib/demo';

export default async function handler(req, res) {
  const symbol = String(req.query.symbol || '').trim().toUpperCase();
  if (!symbol) return res.status(400).json({ ok: false, error: 'symbol required' });

  const key = process.env.FINNHUB_API_KEY;
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || !key;

  if (demoMode) {
    return res.status(200).json({ ok: true, demo: true, data: demoCandles(symbol, 120) });
  }

  try {
    const to = Math.floor(Date.now() / 1000);
    const from = to - 150 * 86400;
    const url = `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=D&from=${from}&to=${to}&token=${key}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data || data.s !== 'ok') {
      return res.status(404).json({ ok: false, error: 'no candle data' });
    }

    const candles = data.t.map((time, index) => ({
      date: time,
      open: data.o[index],
      high: data.h[index],
      low: data.l[index],
      close: data.c[index],
      volume: data.v[index],
    }));

    return res.status(200).json({ ok: true, data: candles });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || 'candles fetch failed' });
  }
}
