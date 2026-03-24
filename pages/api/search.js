import { localSearchUniverse } from "../../lib/universe";
import { isDemoMode, searchSymbol } from "../../lib/finnhub";
import { getCache, setCache } from "../../lib/cache";

export default async function handler(req, res) {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) return res.status(200).json({ ok: true, items: localSearchUniverse("") });

    const cached = getCache(`search:${q}`, 60000);
    if (cached) return res.status(200).json({ ok: true, items: cached, cached: true });

    if (isDemoMode() || !process.env.FINNHUB_API_KEY) {
      return res.status(200).json({ ok: true, items: localSearchUniverse(q) });
    }

    const data = await searchSymbol(q);
    const items = (data.result || [])
      .filter((x) => x.symbol && (x.exchange === "US" || x.type === "Common Stock" || x.mic === "XNAS"))
      .slice(0, 15)
      .map((x) => ({
        symbol: x.symbol,
        description: x.description || x.displaySymbol || ""
      }));

    return res.status(200).json({ ok: true, items: setCache(`search:${q}`, items) });
  } catch (e) {
    return res.status(200).json({
      ok: false,
      items: localSearchUniverse(String(req.query.q || "")),
      error: e.message || "검색 실패"
    });
  }
}
