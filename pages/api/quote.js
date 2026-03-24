const DAY = 24 * 60 * 60;

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

export default async function handler(req, res) {
  const symbol = String(req.query.symbol || '').toUpperCase().trim();
  const apiKey = process.env.FINNHUB_API_KEY;

  if (!symbol) {
    return res.status(400).json({ ok: false, error: 'symbol이 필요합니다.' });
  }

  if (!apiKey) {
    return res.status(200).json({
      ok: false,
      error: 'FINNHUB_API_KEY가 없습니다. .env.local에 키를 입력하세요.'
    });
  }

  try {
    const to = Math.floor(Date.now() / 1000);
    const from = to - DAY * 120;
    const base = 'https://finnhub.io/api/v1';

    const [quote, candles] = await Promise.all([
      getJSON(`${base}/quote?symbol=${symbol}&token=${apiKey}`),
      getJSON(`${base}/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${apiKey}`)
    ]);

    if (!quote?.c || candles?.s !== 'ok') {
      return res.status(200).json({ ok: false, error: '시세 데이터가 충분하지 않습니다.' });
    }

    return res.status(200).json({ ok: true, data: { quote, candles } });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || '서버 오류' });
  }
}
