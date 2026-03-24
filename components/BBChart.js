import { useMemo } from 'react';

export default function BBChart({ stock }) {
  const view = useMemo(() => {
    if (!stock?.차트?.closes?.length) return null;
    const labels = stock.차트.labels;
    const series = [
      { key: 'bb2Upper', name: 'BB +2σ' },
      { key: 'bb1Upper', name: 'BB +1σ' },
      { key: 'ma20', name: 'MA20' },
      { key: 'closes', name: 'Close' },
      { key: 'bb1Mid', name: 'BB Mid' },
      { key: 'bb1Lower', name: 'BB -1σ' },
      { key: 'bb2Lower', name: 'BB -2σ' }
    ];

    const allValues = series.flatMap((s) => stock.차트[s.key].filter((v) => typeof v === 'number'));
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const w = 900;
    const h = 300;
    const p = 28;
    const x = (i) => p + (i / Math.max(labels.length - 1, 1)) * (w - p * 2);
    const y = (v) => h - p - ((v - min) / Math.max(max - min, 1)) * (h - p * 2);

    const pathFor = (arr) => arr
      .map((v, i) => (typeof v === 'number' ? `${i === 0 || arr[i - 1] == null ? 'M' : 'L'} ${x(i)} ${y(v)}` : ''))
      .join(' ');

    return { w, h, min, max, pathFor, labels, x, y };
  }, [stock]);

  if (!view) {
    return <div style={emptyStyle}>차트 데이터가 없습니다.</div>;
  }

  const { w, h, labels, pathFor } = view;

  return (
    <div style={wrapStyle}>
      <div style={titleStyle}>이중 볼린저밴드 차트</div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 320, display: 'block' }}>
        <rect x="0" y="0" width={w} height={h} fill="#0f172a" rx="14" />
        <path d={pathFor(stock.차트.bb2Upper)} fill="none" stroke="#64748b" strokeWidth="1.2" strokeDasharray="5 4" />
        <path d={pathFor(stock.차트.bb1Upper)} fill="none" stroke="#38bdf8" strokeWidth="1.4" />
        <path d={pathFor(stock.차트.ma20)} fill="none" stroke="#f59e0b" strokeWidth="1.4" />
        <path d={pathFor(stock.차트.closes)} fill="none" stroke="#22c55e" strokeWidth="2.2" />
        <path d={pathFor(stock.차트.bb1Mid)} fill="none" stroke="#a78bfa" strokeWidth="1" strokeDasharray="4 4" />
        <path d={pathFor(stock.차트.bb1Lower)} fill="none" stroke="#38bdf8" strokeWidth="1.4" />
        <path d={pathFor(stock.차트.bb2Lower)} fill="none" stroke="#64748b" strokeWidth="1.2" strokeDasharray="5 4" />
      </svg>
      <div style={legendStyle}>
        {['종가', 'MA20', 'BB ±1σ', 'BB ±2σ'].map((text) => (
          <span key={text} style={legendItemStyle}>{text}</span>
        ))}
      </div>
      <div style={axisLabelStyle}>
        최근 {labels.length}개 봉 기준 표시
      </div>
    </div>
  );
}

const wrapStyle = {
  background: '#111827',
  border: '1px solid #1f2937',
  borderRadius: 16,
  padding: 16,
};
const titleStyle = { fontSize: 15, fontWeight: 700, marginBottom: 8 };
const legendStyle = { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 };
const legendItemStyle = {
  fontSize: 12,
  border: '1px solid #374151',
  borderRadius: 999,
  padding: '4px 10px',
  color: '#cbd5e1'
};
const axisLabelStyle = { fontSize: 11, color: '#94a3b8', marginTop: 8 };
const emptyStyle = { background: '#111827', borderRadius: 16, padding: 20, color: '#94a3b8' };
