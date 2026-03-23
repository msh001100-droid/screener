// pages/api/analyze.js
// 서버에서 Anthropic API 호출 (API 키 노출 없음)

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const KEY = process.env.ANTHROPIC_API_KEY;
  if (!KEY) return res.status(500).json({ error: "ANTHROPIC_API_KEY 없음" });

  const { stock } = req.body;
  if (!stock) return res.status(400).json({ error: "stock 데이터 필요" });

  const s = stock;
  const prompt = `나스닥 단타·스윙 전문 트레이더입니다. 이중 볼린저밴드(BB1=2σ, BB2=1σ) 전략으로 분석해 한국어로 답하세요.

[종목] ${s.ticker}
[현재가] $${s.p} | 변동 ${s.ch >= 0 ? "+" : ""}${s.ch}%
[고/저] $${s.h} / $${s.l} | VWAP $${s.vw} | ATR $${s.at}(${s.atp}%)

[이중 볼린저밴드]
BB1 상단(2σ) $${s.bb.b1u} / BB1 하단(2σ) $${s.bb.b1l}
BB2 상단(1σ) $${s.bb.b2u} / BB2 하단(1σ) $${s.bb.b2l}
SMA(20) $${s.bb.sma} | 밴드폭 ${s.bb.bw}%
현재 구간: ${s.zn?.l || "N/A"} → ${s.zn?.s || "N/A"}

[세력 매집]
매집 점수: ${s.sc}/100 (${s.gr.t})
감지 신호: ${s.sig.join(", ") || "없음"}

[매매 레벨]
진입 $${s.en} | 손절 $${s.st} | 1차목표 $${s.t1} | 2차목표 $${s.t2} | 리스크/주 $${s.ri}

다음 형식으로 분석하세요:

▶ 1. 이중BB 분석
현재 구간:
밴드폭 상태(수축/확장):
방향성:

▶ 2. 세력 매집 판단
매집 여부 (예/아니오):
근거 (OBV 근사 + 횡보 + 거래량):

▶ 3. 신중한 진입 전략
진입 $${s.en} 이유:
손절 $${s.st} 이유:
1차목표 $${s.t1} 이유:
2차목표 $${s.t2} 이유:
진입 확인 조건:
예상 보유기간:

▶ 4. 주요 위험 요소 2가지

▶ 5. 최종 추천
진입 / 관망 / 회피 (선택):
한줄 이유:`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      return res.status(r.status).json({ error: t });
    }
    const d = await r.json();
    const text = (d.content || []).map(c => c.text || "").join("").trim();
    res.status(200).json({ text });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
