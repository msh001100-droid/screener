import { demoNews } from '../../lib/demo';

export default async function handler(req, res) {
  const symbol = String(req.query.symbol || '').trim().toUpperCase();
  if (!symbol) return res.status(400).json({ ok: false, error: 'symbol required' });

  const key = process.env.FINNHUB_API_KEY;
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || !key;

  if (demoMode) {
    return res.status(200).json({ ok: true, demo: true, data: demoNews(symbol) });
  }

  try {
    const now = new Date();
    const from = new Date(now.getTime() - 3 * 86400000).toISOString().slice(0, 10);
    const to = now.toISOString().slice(0, 10);
    const url = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(symbol)}&from=${from}&to=${to}&token=${key}`;
    const response = await fetch(url);
    const data = await response.json();
    return res.status(200).json({ ok: true, data: Array.isArray(data) ? data.slice(0, 5) : [] });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || 'news fetch failed' });
  }
}
