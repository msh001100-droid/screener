import { buildStock, filterStocks } from "../../lib/calc";
import { demoCandles, demoNews, demoQuote } from "../../lib/demo";
import { getCandles, getNews, getQuote, isDemoMode, sleep } from "../../lib/finnhub";
import { PRESETS, DEFAULT_UNIVERSE } from "../../lib/universe";
import { getCache, setCache } from "../../lib/cache";

const REQUEST_GAP = 1200;
const REAL_MODE_MAX = 8;
const DEMO_MODE_MAX = 20;
const SCAN_TTL = 45000;

function parseSymbols(raw) {
  return String(raw || "")
    .split(",")
    .map((x) => x.trim().toUpperCase())
    .filter(Boolean)
    .filter((x, i, arr) => arr.indexOf(x) === i);
}

export default async function handler(req, res) {
  try {
    const preset = String(req.query.preset || "전체 후보");
    const customSymbols = parseSymbols(req.query.symbols);
    const rawTickers = customSymbols.length ? customSymbols : (PRESETS[preset] || DEFAULT_UNIVERSE);

    const minScore = Number(req.query.minScore || 0);
    const priceMin = Number(req.query.priceMin || 0);
    const priceMax = Number(req.query.priceMax || 9999);
    const newsOnly = String(req.query.newsOnly || "false") === "true";
    const breakoutOnly = String(req.query.breakoutOnly || "false") === "true";
    const pullbackOnly = String(req.query.pullbackOnly || "false") === "true";

    const realMode = !(isDemoMode() || !process.env.FINNHUB_API_KEY);
    const maxSymbols = Math.max(
      1,
      Math.min(Number(req.query.maxSymbols || (realMode ? REAL_MODE_MAX : DEMO_MODE_MAX)), realMode ? REAL_MODE_MAX : DEMO_MODE_MAX)
    );
    const tickers = rawTickers.slice(0, maxSymbols);

    const cacheKey = JSON.stringify({
      preset,
      symbols: tickers,
      minScore,
      priceMin,
      priceMax,
      newsOnly,
      breakoutOnly,
      pullbackOnly
    });
    const cached = getCache(`scan:${cacheKey}`, SCAN_TTL);
    if (cached) {
      return res.status(200).json({ ok: true, ...cached, cached: true });
    }

    const results = [];

    if (!realMode) {
      for (const symbol of tickers) {
        results.push(buildStock(symbol, {
          quote: demoQuote(symbol),
          candles: demoCandles(symbol),
          news: demoNews(symbol)
        }));
      }
    } else {
      for (const symbol of tickers) {
        try {
          const quote = await getQuote(symbol);
          await sleep(250);
          const candles = await getCandles(symbol);
          await sleep(250);
          const news = await getNews(symbol);
          results.push(buildStock(symbol, { quote, candles, news }));
          await sleep(REQUEST_GAP);
        } catch (e) {
          results.push({
            ticker: symbol,
            price: 0,
            changePct: 0,
            score: 0,
            tags: ["오류"],
            hasNews: false,
            error: e.message || "조회 실패"
          });
          await sleep(REQUEST_GAP);
        }
      }
    }

    const filtered = filterStocks(results, { minScore, priceMin, priceMax, newsOnly, breakoutOnly, pullbackOnly })
      .sort((a, b) => b.score - a.score)
      .slice(0, realMode ? 8 : 20);

    const payload = {
      count: filtered.length,
      preset: customSymbols.length ? "사용자 지정" : preset,
      scanned: tickers.length,
      realMode,
      items: filtered
    };

    return res.status(200).json({ ok: true, ...setCache(`scan:${cacheKey}`, payload) });
  } catch (e) {
    return res.status(200).json({
      ok: false,
      error: e.message || "스캔 실패",
      hint: "Finnhub 무료 호출 한도에 걸리면 실데이터 스캔은 워치리스트 6~8종목 위주로 운용하는 것이 안전합니다.",
      items: []
    });
  }
}
