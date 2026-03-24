export default function BBChart({ stock }) {
  if (!stock?.candles?.length) {
    return <div style={{ padding: 20, background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb" }}>차트 데이터가 없습니다.</div>;
  }

  const values = stock.candles.map((d) => d.close);
  const max = Math.max(...values, stock.upper2);
  const min = Math.min(...values, stock.lower2);
  const w = 760;
  const h = 260;
  const pad = 20;

  const toX = (i) => pad + (i / (values.length - 1)) * (w - pad * 2);
  const toY = (v) => h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2);

  const line = values.map((v, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(v)}`).join(" ");

  const hLine = (val) => `M ${pad} ${toY(val)} L ${w - pad} ${toY(val)}`;

  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>이중 볼린저밴드 차트</div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "auto", background: "#fbfdff", borderRadius: 10 }}>
        <path d={hLine(stock.upper2)} stroke="#fca5a5" strokeDasharray="6 4" fill="none" />
        <path d={hLine(stock.upper1)} stroke="#fdba74" strokeDasharray="6 4" fill="none" />
        <path d={hLine(stock.ma20)} stroke="#60a5fa" strokeDasharray="6 4" fill="none" />
        <path d={hLine(stock.ma50)} stroke="#34d399" strokeDasharray="6 4" fill="none" />
        <path d={hLine(stock.lower1)} stroke="#fdba74" strokeDasharray="6 4" fill="none" />
        <path d={hLine(stock.lower2)} stroke="#fca5a5" strokeDasharray="6 4" fill="none" />
        <path d={line} stroke="#111827" strokeWidth="2.5" fill="none" />
      </svg>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, marginTop: 10, color: "#4b5563" }}>
        <span>검정: 종가</span>
        <span>파랑: MA20</span>
        <span>초록: MA50</span>
        <span>주황: ±1σ</span>
        <span>빨강: ±2σ</span>
      </div>
    </div>
  );
}
