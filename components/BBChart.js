export default function BBChart({ stock }) {
  if (!stock || !stock.candles || !stock.candles.length) {
    return (
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 16 }}>
        차트 데이터가 없습니다.
      </div>
    );
  }

  const width = 760;
  const height = 240;
  const pad = 20;
  const values = stock.candles.map((x) => x.close);
  const max = Math.max(...values, stock.upper2);
  const min = Math.min(...values, stock.lower2);

  const toX = (i) => pad + (i / Math.max(1, values.length - 1)) * (width - pad * 2);
  const toY = (v) => height - pad - ((v - min) / Math.max(1e-9, max - min)) * (height - pad * 2);

  const priceLine = values.map((v, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(v)}`).join(" ");
  const horizontal = (y) => `M ${pad} ${toY(y)} L ${width - pad} ${toY(y)}`;

  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 16 }}>
      <div style={{ fontWeight: 800, marginBottom: 10 }}>이중 볼린저밴드</div>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto", background: "#fcfdff", borderRadius: 10 }}>
        <path d={horizontal(stock.upper2)} stroke="#f87171" strokeDasharray="6 4" fill="none" />
        <path d={horizontal(stock.upper1)} stroke="#fb923c" strokeDasharray="6 4" fill="none" />
        <path d={horizontal(stock.ma20)} stroke="#60a5fa" strokeDasharray="6 4" fill="none" />
        <path d={horizontal(stock.ma50)} stroke="#34d399" strokeDasharray="6 4" fill="none" />
        <path d={horizontal(stock.lower1)} stroke="#fb923c" strokeDasharray="6 4" fill="none" />
        <path d={horizontal(stock.lower2)} stroke="#f87171" strokeDasharray="6 4" fill="none" />
        <path d={priceLine} stroke="#111827" strokeWidth="2.5" fill="none" />
      </svg>
    </div>
  );
}
