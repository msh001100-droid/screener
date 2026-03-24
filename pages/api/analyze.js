// pages/api/analyze.js
// Groq AI 분석 (무료 - Llama3-70B)

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const KEY = process.env.GROQ_API_KEY;
  if (!KEY) {
    return res.status(500).json({
      error: "GROQ_API_KEY 환경변수 없음. Vercel > Settings > Environment Variables 에서 추가 후 Redeploy 필요",
    });
  }

  const { stock: s } = req.body;
  if (!s || !s.ticker) return res.status(400).json({ error: "종목 데이터 없음" });

  const prompt = `당신은 나스닥 단타·스윙 트레이딩 전문가입니다.
이중 볼린저밴드(BB1=2표준편차 외부밴드, BB2=1표준편차 내부밴드) 전략을 기반으로 아래 종목을 분석해 한국어로 답하세요.

[종목] ${s.ticker}
[현재가] $${s.현재가} | 변동률 ${s.변동률 >= 0 ? "+" : ""}${s.변동률}%
[고가/저가] $${s.고가} / $${s.저가} | VWAP $${s.vwap} | ATR $${s.atr}(${s.atr비율}%)

[이중 볼린저밴드 분석]
BB1 상단(2σ): $${s.bb.bb1상단}   BB1 하단(2σ): $${s.bb.bb1하단}
BB2 상단(1σ): $${s.bb.bb2상단}   BB2 하단(1σ): $${s.bb.bb2하단}
이동평균(20일): $${s.bb.이평선}   밴드폭: ${s.bb.밴드폭}%
현재 구간: ${s.bb구간?.명칭 || "N/A"} → ${s.bb구간?.신호 || "N/A"}

[세력 매집 분석]
매집 점수: ${s.매집점수}/100점 (${s.매집등급.명칭})
감지된 신호: ${s.매집신호.join(", ") || "없음"}

[매매 레벨]
진입가: $${s.진입가} | 손절가: $${s.손절가} | 1차 목표: $${s.목표1} | 2차 목표: $${s.목표2}
리스크/주: $${s.리스크}

다음 형식으로 분석하세요:

▶ 1. 이중 볼린저밴드 분석
- 현재 구간 해석:
- 밴드폭 상태 (수축=매집 직전, 확장=추세 진행 중):
- BB 기반 방향성 판단:

▶ 2. 세력 매집 판단
- 매집 여부 (예/아니오):
- 핵심 근거:

▶ 3. 신중한 진입 전략
- 진입가 $${s.진입가} 이유:
- 손절가 $${s.손절가} 이유:
- 1차 목표 $${s.목표1} 이유:
- 2차 목표 $${s.목표2} 이유:
- 진입 확인 조건 (어떤 신호 후 진입):
- 예상 보유 기간:

▶ 4. 주요 위험 요소 (2가지)

▶ 5. 최종 추천
- 진입 / 관망 / 회피 중 선택:
- 한 줄 이유:`;

  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 1200,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content: "당신은 나스닥 단타·스윙 전문 트레이더입니다. 이중 볼린저밴드 전략과 세력 매집 분석에 특화되어 있습니다. 반드시 한국어로 답변하세요.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!r.ok) {
      const 오류 = await r.text();
      return res.status(r.status).json({ error: `Groq 오류 ${r.status}: ${오류.slice(0, 200)}` });
    }

    const d = await r.json();
    const 분석내용 = d.choices?.[0]?.message?.content?.trim() || "분석 결과 없음";
    res.status(200).json({ text: 분석내용 });

  } catch (e) {
    res.status(500).json({ error: "AI 분석 오류: " + e.message });
  }
}
