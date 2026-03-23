// pages/api/quote.js
// 서버에서 Finnhub 호출 → CORS 문제 완전 해결

export default async function handler(req, res) {
  const { symbols } = req.query;
  if (!symbols) return res.status(400).json({ error: "symbols 파라미터 필요" });

  const KEY = process.env.FINNHUB_API_KEY;
  if (!KEY) return res.status(500).json({ error: "FINNHUB_API_KEY 환경변수 없음" });

  const tickerList = symbols.split(",").map(s => s.trim().toUpperCase()).slice(0, 30);

  const results = await Promise.allSettled(
    tickerList.map(async (ticker) => {
      const r = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${KEY}`,
        { headers: { "User-Agent": "nasdaq-screener/1.0" } }
      );
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      if (!d.c || d.c <= 0) return null;
      return {
        ticker,
        c:  +d.c.toFixed(3),   // 현재가
        pc: d.pc || d.c,        // 전일 종가
        h:  d.h  || d.c * 1.02,// 고가
        l:  d.l  || d.c * 0.98,// 저가
        o:  d.o  || d.pc,       // 시가
        t:  d.t  || 0,          // 타임스탬프
      };
    })
  );

  const data = {};
  results.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value) {
      data[tickerList[i]] = r.value;
    }
  });

  // 캐시: 30초
  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");
  res.status(200).json({ data, updatedAt: new Date().toISOString() });
}
