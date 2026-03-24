import { buildStock } from "../../lib/calc";
import { demoCandles, demoNews, demoQuote } from "../../lib/demo";
import { getCandles, getNews, getQuote, isDemoMode, sleep } from "../../lib/finnhub";
import { getCache, setCache } from "../../lib/cache";

function parseSymbols(value) {
  return String(value || "")
    .split(",")
    .map((x) => x.trim().toUpperCase())
    .filter(Boolean)
    .filter((x, i, arr) => arr.indexOf(x) === i);
}

export default async function handler(req, res) {
  const symbols = parseSymbols(req.query.symbols);
  const maxSymbols = Math.min(Math.max(Number(req.query.maxSymbols || 6), 1), 8);

  if (!symbols.length) {
    return res.status(400).json({ ok: false, error: "스캔할 symbols가 필요합니다." });
  }

  const targetSymbols = symbols.slice(0, maxSymbols);

  try {
    const cacheKey = `scan:${targetSymbols.join(",")}`;
    const cached = getCache(cacheKey, 45000);
    if (cached) {
      return res.status(200).json({ ok: true, items: cached, scanned: targetSymbols.length, cached: true });
    }

    const results = [];

    if (isDemoMode() || !process.env.FINNHUB_API_KEY) {
      for (const symbol of targetSymbols) {
        results.push(buildStock(symbol, {
          quote: demoQuote(symbol),
          candles: demoCandles(symbol),
          news: demoNews(symbol)
        }));
      }
    } else {
      for (const symbol of targetSymbols) {
        try {
          const quote = await getQuote(symbol);
          await sleep(250);
          const candles = await getCandles(symbol);
          await sleep(250);
          const news = await getNews(symbol);
          results.push(buildStock(symbol, { quote, candles, news }));
          await sleep(1200);
        } catch (error) {
          results.push({
            ticker: symbol,
            price: 0,
            changePct: 0,
            score: 0,
            tags: ["오류"],
            entry: 0,
            stop: 0,
            target1: 0,
            target2: 0,
            rr: 0,
            news: [],
            candles: []
          });
        }
      }
    }

    const sorted = results.sort((a, b) => b.score - a.score);
    return res.status(200).json({
      ok: true,
      items: setCache(cacheKey, sorted),
      scanned: targetSymbols.length
    });
  } catch (error) {
    return res.status(200).json({
      ok: false,
      error: error.message || "스캔 실패",
      hint: "무료 API 환경에서는 워치리스트 6~8종목 운용이 안전합니다.",
      items: []
    });
  }
}
