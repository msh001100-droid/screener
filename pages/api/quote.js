import { demoQuote } from '../../lib/demo';

export default async function handler(req, res) {
  const symbol = String(req.query.symbol || '').trim().toUpperCase();
  if (!symbol) return res.status(400).json({ ok: false, error: 'symbol required' });

  const key = process.env.FINNHUB_API_KEY;
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || !key;

  if (demoMode) {
    return res.status(200).json({ ok: true, demo: true, data: demoQuote(symbol) });
  }

  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${key}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data || typeof data.c !== 'number' || data.c === 0) {
      return res.status(404).json({ ok: false, error: 'invalid quote data' });
    }

    const premarketGapPct = data.pc ? Number((((data.o - data.pc) / data.pc) * 100).toFixed(2)) : 0;
    return res.status(200).json({ ok: true, data: { ...data, premarketGapPct, v: data.v || 0 } });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || 'quote fetch failed' });
  }
}
