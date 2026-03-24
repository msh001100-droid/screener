// pages/api/quote.js
// Finnhub 서버 프록시 - CORS 완전 해결
// symbol 파라미터로 단일 종목 조회
// 응답: { ok: true, data: { c, pc, h, l, o, t } }

export const config = { maxDuration: 15 };

export default async function handler(req, res) {
  // symbol 파라미터 추출 (단수/복수 모두 지원)
  const raw    = req.query.symbol || req.query.symbols || "";
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
      error: "FINNHUB_API_KEY 환경변수 없음. Vercel > Settings > Environment Variables 에서 추가 후 Redeploy 필요",
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
      return res.status(200).json({ ok: false, error: `Finnhub 오류 HTTP ${r.status}` });
    }

    const d = await r.json();

    // c: 현재가, pc: 전일종가
    if (!d || typeof d.c !== "number" || d.c <= 0) {
      return res.status(200).json({
        ok: false,
        error: `${symbol}: 데이터 없음 (상장폐지 또는 잘못된 티커)`,
      });
    }

    // 30초 캐시
    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");

    // ★ 핵심: data 객체 안에 담아서 반환
    res.status(200).json({
      ok: true,
      symbol,
      data: {
        c:  +d.c.toFixed(3),               // 현재가
        pc: +(d.pc  || d.c).toFixed(3),    // 전일종가
        h:  +(d.h   || d.c * 1.02).toFixed(3), // 고가
        l:  +(d.l   || d.c * 0.98).toFixed(3), // 저가
        o:  +(d.o   || d.pc || d.c).toFixed(3), // 시가
        t:  d.t || 0,                      // 타임스탬프
      },
    });

  } catch (e) {
    const 메시지 = e.name === "AbortError" ? "10초 타임아웃 — 잠시 후 재시도" : e.message;
    res.status(200).json({ ok: false, error: 메시지 });
  }
}
