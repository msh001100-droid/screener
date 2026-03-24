import { useMemo } from 'react';

function makeSeries(stock) {
  const candles = stock?.candles || [];
  if (!candles.length) return [];

  const closes = candles.map((c) => c.close);
  const rows = [];

  function avg(values) {
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  function deviation(values, mean) {
    return Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length);
  }

  for (let i = 0; i < candles.length; i += 1) {
    const start = Math.max(0, i - 19);
    const slice = closes.slice(start, i + 1);
    const ma = slice.length >= 5 ? avg(slice) : null;
    const sd = ma != null ? deviation(slice, ma) : null;
    rows.push({
      index: i,
      close: candles[i].close,
      ma20: ma,
      upper1: ma != null && sd != null ? ma + sd : null,
      lower1: ma != null && sd != null ? ma - sd : null,
      upper2: ma != null && sd != null ? ma + sd * 2 : null,
      lower2: ma != null && sd != null ? ma - sd * 2 : null,
    });
  }

  return rows.slice(-50);
}

export default function BBChart({ stock }) {
  const data = useMemo(() => makeSeries(stock), [stock]);

  if (!data.length) {
    return <div className="small">차트 데이터가 없습니다.</div>;
  }

  const allValues = data.flatMap((row) => [row.close, row.ma20, row.upper1, row.lower1, row.upper2, row.lower2].filter((v) => v != null));
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const width = 860;
  const height = 290;
  const pad = 24;

  const x = (index) => pad + (index / Math.max(data.length - 1, 1)) * (width - pad * 2);
  const y = (value) => height - pad - ((value - min) / Math.max(max - min, 0.0001)) * (height - pad * 2);

  function pathFor(key) {
    return data
      .map((row, index) => (row[key] == null ? null : `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(row[key])}`))
      .filter(Boolean)
      .join(' ');
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="300" role="img" aria-label="bollinger band chart">
        <rect x="0" y="0" width={width} height={height} fill="#ffffff" />
        {[0, 1, 2, 3].map((line) => {
          const py = pad + ((height - pad * 2) / 3) * line;
          return <line key={line} x1={pad} x2={width - pad} y1={py} y2={py} stroke="#e4e7ec" strokeWidth="1" />;
        })}
        <path d={pathFor('upper2')} fill="none" stroke="#fec84b" strokeWidth="1.5" strokeDasharray="4 4" />
        <path d={pathFor('upper1')} fill="none" stroke="#f79009" strokeWidth="1.5" />
        <path d={pathFor('ma20')} fill="none" stroke="#155eef" strokeWidth="2" />
        <path d={pathFor('lower1')} fill="none" stroke="#12b76a" strokeWidth="1.5" />
        <path d={pathFor('lower2')} fill="none" stroke="#6ce9a6" strokeWidth="1.5" strokeDasharray="4 4" />
        <path d={pathFor('close')} fill="none" stroke="#101828" strokeWidth="2.5" />
      </svg>
      <div className="legendRow">
        <span className="legendItem"><i style={{ background: '#101828' }} /> 종가</span>
        <span className="legendItem"><i style={{ background: '#155eef' }} /> MA20</span>
        <span className="legendItem"><i style={{ background: '#f79009' }} /> +1σ</span>
        <span className="legendItem"><i style={{ background: '#12b76a' }} /> -1σ</span>
        <span className="legendItem"><i style={{ background: '#fec84b' }} /> +2σ</span>
        <span className="legendItem"><i style={{ background: '#6ce9a6' }} /> -2σ</span>
      </div>
    </div>
  );
}
