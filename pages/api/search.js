import { localSearch } from "../../lib/universe";
import { isDemoMode, searchSymbols } from "../../lib/finnhub";
import { getCache, setCache } from "../../lib/cache";

export default async function handler(req, res) {
  const q = String(req.query.q || "").trim();

  try {
    const cached = getCache(`search:${q}`, 60000);
    if (cached) {
      return res.status(200).json({ ok: true, items: cached, cached: true });
    }

    if (!q) {
      return res.status(200).json({ ok: true, items: localSearch("") });
    }

    if (isDemoMode() || !process.env.FINNHUB_API_KEY) {
      return res.status(200).json({ ok: true, items: setCache(`search:${q}`, localSearch(q)) });
    }

    const data = await searchSymbols(q);
    const items = (data.result || [])
      .filter((x) => x && x.symbol)
      .slice(0, 15)
      .map((x) => ({
        symbol: x.symbol,
        description: x.description || x.displaySymbol || ""
      }));

    return res.status(200).json({ ok: true, items: setCache(`search:${q}`, items) });
  } catch (error) {
    return res.status(200).json({
      ok: false,
      items: localSearch(q),
      error: error.message || "검색 실패"
    });
  }
}
