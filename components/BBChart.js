// components/BBChart.js

export default function BBChart({ stock }) {
  const { p, bb } = stock;
  if (!bb) return null;

  const rng = bb.b1u - bb.b1l;
  if (rng <= 0) return null;

  const pct = v =>
    `${Math.max(1, Math.min(99, ((v - bb.b1l) / rng) * 100)).toFixed(1)}%`;

  const zones = [
    { l: "BB1 상단 돌파",  d: "가격 > BB1상단",     c: "#ff4d4d", s: "과매수 주의" },
    { l: "★ 매수 구간",   d: "BB2상단 ~ BB1상단",  c: "#00ff88", s: "진입 적합" },
    { l: "중립 상단",     d: "SMA ~ BB2상단",       c: "#ffd700", s: "관망" },
    { l: "중립 하단",     d: "BB2하단 ~ SMA",       c: "#ff9944", s: "조정" },
    { l: "매도 구간",     d: "BB1하단 ~ BB2하단",   c: "#ff6633", s: "반등 대기" },
    {
      l: `밴드폭 ${bb.bw}%`,
      d: bb.bw <= 6 ? "수축! 매집직전" : bb.bw <= 10 ? "좁아짐" : "정상",
      c: bb.bw <= 6 ? "#ff4d4d" : "#00d4ff",
      s: bb.bw <= 6 ? "🚨 주목" : "",
    },
  ];

  return (
    <div style={{
      background: "#060f1c",
      border: "1px solid #0d1e30",
      borderRadius: 10,
      padding: 16,
      marginBottom: 12,
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#3a6080", marginBottom: 14 }}>
        📊 이중 볼린저밴드 — BB1(2σ 외부) · BB2(1σ 내부)
      </div>

      {/* 바 시각화 */}
      <div style={{ position: "relative", height: 52, marginBottom: 14 }}>
        {/* BB1 배경 */}
        <div style={{
          position: "absolute", left: 0, right: 0,
          top: 13, height: 26,
          background: "#ff4d4d08",
          border: "1px solid #ff4d4d22",
          borderRadius: 5,
        }}/>
        {/* BB2 상단 매수구간 하이라이트 */}
        <div style={{
          position: "absolute",
          left: pct(bb.b2u), right: "1%",
          top: 13, height: 26,
          background: "#00ff8813",
          borderLeft: "2px solid #00ff8866",
        }}/>
        {/* SMA 라인 */}
        <div style={{
          position: "absolute",
          left: pct(bb.sma),
          top: 8, width: 2, height: 36,
          background: "#ffd700",
          borderRadius: 2,
        }}/>
        {/* BB2 상단 라인 */}
        <div style={{
          position: "absolute",
          left: pct(bb.b2u),
          top: 8, width: 1, height: 36,
          background: "#00ff8888",
        }}/>
        {/* BB2 하단 라인 */}
        <div style={{
          position: "absolute",
          left: pct(bb.b2l),
          top: 8, width: 1, height: 36,
          background: "#ff994488",
        }}/>
        {/* 현재가 */}
        <div style={{
          position: "absolute",
          left: pct(p),
          top: 5,
          transform: "translateX(-50%)",
        }}>
          <div style={{
            width: 14, height: 14,
            borderRadius: "50%",
            background: "#fff",
            border: "2px solid #00d4ff",
            boxShadow: "0 0 10px #00d4ff88",
            marginTop: 11,
          }}/>
        </div>
      </div>

      {/* 레이블 */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        marginBottom: 14,
      }}>
        {[
          { l: "BB1 하단", v: `$${bb.b1l}`, c: "#ff4d4d" },
          { l: "BB2 하단", v: `$${bb.b2l}`, c: "#ff9944" },
          { l: "SMA",     v: `$${bb.sma}`,  c: "#ffd700" },
          { l: "BB2 상단", v: `$${bb.b2u}`, c: "#00ff88" },
          { l: "BB1 상단", v: `$${bb.b1u}`, c: "#ff4d4d" },
        ].map((x, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 9, color: x.c, fontWeight: 700 }}>{x.l}</div>
            <div style={{
              fontSize: 10,
              color: x.c,
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 700,
            }}>{x.v}</div>
          </div>
        ))}
      </div>

      {/* 구간 설명 */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 6,
        marginBottom: 14,
      }}>
        {zones.map((z, i) => (
          <div key={i} style={{
            background: z.c + "0d",
            border: `1px solid ${z.c}33`,
            borderRadius: 7,
            padding: "6px 8px",
          }}>
            <div style={{ fontSize: 9, color: z.c, fontWeight: 700 }}>{z.l}</div>
            <div style={{ fontSize: 8, color: "#2a5070", marginTop: 2 }}>{z.d}</div>
            {z.s && <div style={{ fontSize: 8, color: z.c, marginTop: 1 }}>{z.s}</div>}
          </div>
        ))}
      </div>

      {/* 전략 요약 */}
      <div style={{
        padding: "10px 14px",
        background: "#030810",
        borderRadius: 8,
        fontSize: 12,
        color: "#2a5070",
        lineHeight: 1.9,
      }}>
        <strong style={{ color: "#ffd700" }}>이중BB 핵심 전략:</strong><br/>
        ① <strong style={{ color: "#00ff88" }}>BB2상단~BB1상단 = ★ 매수 구간</strong> — 최적 진입 위치<br/>
        ② 밴드 수축(bw &lt; 6%) = 큰 변동 직전, 매집 완료 신호<br/>
        ③ BB1 상단 돌파 + 유지 = 강한 상승 추세 지속<br/>
        ④ BB2 하단 이탈 = 매도 신호, BB1 하단이 최종 지지선
      </div>
    </div>
  );
}
