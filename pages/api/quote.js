import { buildStock } from "../../lib/calc";
import { demoCandles, demoNews, demoQuote } from "../../lib/demo";
import { getCandles, getNews, getQuote, isDemoMode } from "../../lib/finnhub";
import { getCache, setCache } from "../../lib/cache";

export default async function handler(req, res) {
  const symbol = String(req.query.symbol || "").trim().toUpperCase();
  if (!symbol) return res.status(400).json({ ok: false, error: "symbol이 필요합니다." });

  try {
    const cached = getCache(`quote:${symbol}`, 15000);
    if (cached) return res.status(200).json({ ok: true, data: cached, cached: true });

    if (isDemoMode() || !process.env.FINNHUB_API_KEY) {
      const stock = buildStock(symbol, {
        quote: demoQuote(symbol),
        candles: demoCandles(symbol),
        news: demoNews(symbol)
      });
      return res.status(200).json({ ok: true, data: setCache(`quote:${symbol}`, stock), demo: true });
    }

    const [quote, candles, news] = await Promise.all([
      getQuote(symbol),
      getCandles(symbol),
      getNews(symbol)
    ]);

    const stock = buildStock(symbol, { quote, candles, news });
    return res.status(200).json({ ok: true, data: setCache(`quote:${symbol}`, stock) });
  } catch (e) {
    return res.status(200).json({ ok: false, error: e.message || "시세 조회 실패", hint: "호출 제한 또는 잘못된 티커일 수 있습니다." });
  }
}
