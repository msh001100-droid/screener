// pages/api/quote.js
// symbol 또는 symbols 파라미터 모두 지원 (하위 호환)

export const config = {
  maxDuration: 15,
};

export default async function handler(req, res) {
  // symbol 또는 symbols 둘 다 지원
  const raw = req.query.symbol || req.query.symbols || "";
  const symbol = raw.split(",")[0].trim().toUpperCase();

  if (!symbol) {
    return res.status(400).json({
      ok: false,
      error: "symbol 파라미터 필요. 예: /api/quote?symbol=AAPL",
    });
  }

  const KEY = process.env.FINNHUB_API_KEY;
  if (!KEY) {
    return res.status(500).json({
      ok: false,
      error: "FINNHUB_API_KEY 환경변수 없음 — Vercel Settings > Environment Variables 확인 후 Redeploy 필요",
    });
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    const r = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${KEY}`,
      { signal: controller.signal }
    );
    clearTimeout(timer);

    if (!r.ok) {
      return res.status(200).json({ ok: false, error: `Finnhub HTTP ${r.status}` });
    }

    const d = await r.json();

    if (!d || !d.c || d.c <= 0) {
      return res.status(200).json({
        ok: false,
        error: `${symbol} 데이터 없음 (상장폐지 또는 잘못된 티커)`,
      });
    }

    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");
    res.status(200).json({
      ok: true,
      symbol,
      data: {
        c:  +d.c.toFixed(3),
        pc: +(d.pc || d.c).toFixed(3),
        h:  +(d.h  || d.c * 1.02).toFixed(3),
        l:  +(d.l  || d.c * 0.98).toFixed(3),
        o:  +(d.o  || d.pc || d.c).toFixed(3),
        t:  d.t || 0,
      },
    });
  } catch (e) {
    const msg = e.name === "AbortError" ? "10초 타임아웃" : e.message;
    res.status(200).json({ ok: false, error: msg });
  }
}
