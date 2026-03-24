import { useEffect, useMemo, useRef, useState } from 'react';
import BBChart from '../components/BBChart';
import { 기본종목, buildStock } from '../lib/calc';

const 요청간격 = 1200;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function badgeColor(tag) {
  if (tag.includes('상승') || tag.includes('모멘텀') || tag.includes('돌파')) return '#22c55e';
  if (tag.includes('수축') || tag.includes('눌림')) return '#38bdf8';
  if (tag.includes('과열') || tag.includes('약세')) return '#f59e0b';
  return '#94a3b8';
}

function Tag({ text }) {
  const color = badgeColor(text);
  return (
    <span style={{ background: `${color}18`, border: `1px solid ${color}44`, color, borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 700 }}>
      {text}
    </span>
  );
}

function ValueCard({ title, value, sub, accent = '#38bdf8' }) {
  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderLeft: `4px solid ${accent}`, borderRadius: 14, padding: 14 }}>
      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 800 }}>{value}</div>
      {sub ? <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>{sub}</div> : null}
    </div>
  );
}

function ListRow({ stock, selected, onClick }) {
  return (
    <button
      onClick={() => onClick(stock)}
      style={{
        width: '100%',
        textAlign: 'left',
        background: selected ? '#162235' : '#0f172a',
        border: selected ? '1px solid #38bdf8' : '1px solid #1f2937',
        color: '#e5e7eb',
        borderRadius: 14,
        padding: 14,
        cursor: 'pointer'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{stock.ticker}</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>점수 {stock.매집점수} / RSI {stock.rsi14}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>${stock.현재가}</div>
          <div style={{ fontSize: 12, color: stock.등락률 >= 0 ? '#22c55e' : '#f87171' }}>{stock.등락률}%</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
        {stock.태그.slice(0, 4).map((t) => <Tag key={t} text={t} />)}
      </div>
    </button>
  );
}

export default function Home() {
  const [watchlist, setWatchlist] = useState(기본종목);
  const [input, setInput] = useState('');
  const [stocks, setStocks] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, symbol: '' });
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);
  const [live, setLive] = useState(false);
  const [filter, setFilter] = useState('all');
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const liveRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('nasdaqWatchlistV2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) setWatchlist(parsed);
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('nasdaqWatchlistV2', JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    if (!live || !selected) {
      if (liveRef.current) clearInterval(liveRef.current);
      return;
    }

    const tick = async () => {
      try {
        const res = await fetch(`/api/quote?symbol=${selected.ticker}`);
        const json = await res.json();
        if (!json.ok || !json.data) return;
        const updated = buildStock(selected.ticker, json.data);
        if (!updated) return;
        setStocks((prev) => prev.map((s) => (s.ticker === updated.ticker ? updated : s)).sort((a, b) => b.매집점수 - a.매집점수));
        setSelected(updated);
      } catch {}
    };

    liveRef.current = setInterval(tick, 15000);
    return () => clearInterval(liveRef.current);
  }, [live, selected]);

  const filteredStocks = useMemo(() => {
    const items = [...stocks];
    if (filter === 'breakout') return items.filter((s) => s.태그.includes('밴드돌파'));
    if (filter === 'pullback') return items.filter((s) => s.태그.includes('눌림후보'));
    if (filter === 'squeeze') return items.filter((s) => s.태그.includes('밴드수축'));
    return items;
  }, [stocks, filter]);

  async function scan() {
    setLoading(true);
    setAiText('');
    setNotice('');
    setLogs([]);
    setProgress({ current: 0, total: watchlist.length, symbol: '' });
    const results = [];

    for (let i = 0; i < watchlist.length; i += 1) {
      const symbol = String(watchlist[i] || '').trim().toUpperCase();
      setProgress({ current: i + 1, total: watchlist.length, symbol });
      setLogs((prev) => [...prev, `조회 시작: ${symbol}`]);
      try {
        const res = await fetch(`/api/quote?symbol=${symbol}`);
        const json = await res.json();
        if (!json.ok || !json.data) {
          setLogs((prev) => [...prev, `실패: ${symbol} - ${json.error || '데이터 없음'}`]);
        } else {
          const built = buildStock(symbol, json.data);
          if (built) {
            results.push(built);
            setLogs((prev) => [...prev, `완료: ${symbol} / 점수 ${built.매집점수}`]);
          } else {
            setLogs((prev) => [...prev, `스킵: ${symbol} - 지표 계산 불가`]);
          }
        }
      } catch (error) {
        setLogs((prev) => [...prev, `오류: ${symbol} - ${error.message}`]);
      }
      if (i < watchlist.length - 1) await sleep(요청간격);
    }

    const sorted = results.sort((a, b) => b.매집점수 - a.매집점수);
    setStocks(sorted);
    setSelected(sorted[0] || null);
    if (!sorted.length) setNotice('스캔 결과가 없습니다. API 키 또는 티커를 확인하세요.');
    else setNotice(`스캔 완료: ${sorted.length}개 종목 분석 완료`);
    setLoading(false);
  }

  function addTicker() {
    const ticker = input.trim().toUpperCase();
    if (!ticker) return;
    const next = [...new Set([...watchlist, ticker])];
    setWatchlist(next);
    setInput('');
    setNotice(`${ticker} 추가 완료`);
  }

  function removeTicker(ticker) {
    const next = watchlist.filter((x) => x !== ticker);
    setWatchlist(next.length ? next : 기본종목);
  }

  function resetList() {
    setWatchlist(기본종목);
    setNotice('기본 종목으로 리셋했습니다.');
  }

  async function runAI() {
    if (!selected) return;
    setAiLoading(true);
    setAiText('');
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: selected })
      });
      const json = await res.json();
      setAiText(json.text || '분석 결과가 없습니다.');
      if (json.warning) setNotice(`AI 폴백 사용: ${json.warning}`);
    } catch (error) {
      setAiText(`분석 실패: ${error.message}`);
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #07101f 0%, #0b1220 100%)' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: 24 }}>
        <header style={{ display: 'grid', gap: 16, gridTemplateColumns: '1.3fr 1fr', marginBottom: 20 }}>
          <div style={{ background: '#0f172a', border: '1px solid #1f2937', borderRadius: 20, padding: 20 }}>
            <div style={{ fontSize: 28, fontWeight: 900 }}>📈 나스닥 실전형 급등주 스크리너</div>
            <div style={{ color: '#94a3b8', marginTop: 8, lineHeight: 1.6 }}>
              센트로용으로 재구성한 실전형 버전입니다. 점수 상위 종목을 먼저 압축하고, 눌림·돌파·수축 후보를 빠르게 구분하도록 설계했습니다.
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
              <button onClick={scan} disabled={loading} style={primaryBtn}>{loading ? '스캔 중...' : '전체 스캔 실행'}</button>
              <button onClick={() => setLive((v) => !v)} style={live ? greenBtn : darkBtn}>{live ? '📡 LIVE ON' : '📡 LIVE OFF'}</button>
              <button onClick={resetList} style={darkBtn}>기본종목 리셋</button>
              {selected ? (
                <a href={`https://www.tradingview.com/symbols/NASDAQ-${selected.ticker}/`} target="_blank" rel="noreferrer" style={{ ...darkBtn, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                  TradingView 차트
                </a>
              ) : null}
            </div>
            {notice ? <div style={{ marginTop: 14, color: '#cbd5e1', fontSize: 13 }}>{notice}</div> : null}
          </div>

          <div style={{ background: '#0f172a', border: '1px solid #1f2937', borderRadius: 20, padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 10 }}>워치리스트 관리</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="티커 입력 예: SOUN"
                style={inputStyle}
                onKeyDown={(e) => e.key === 'Enter' && addTicker()}
              />
              <button onClick={addTicker} style={primaryBtn}>추가</button>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
              {watchlist.map((ticker) => (
                <span key={ticker} style={chipStyle}>
                  {ticker}
                  <button onClick={() => removeTicker(ticker)} style={chipCloseBtn}>×</button>
                </span>
              ))}
            </div>
          </div>
        </header>

        <section style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20 }}>
          <aside style={{ background: '#0f172a', border: '1px solid #1f2937', borderRadius: 20, padding: 16, height: 'fit-content' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 800 }}>스캔 결과</div>
              <button onClick={() => setShowLogs((v) => !v)} style={miniBtn}>{showLogs ? '로그 숨김' : '로그 보기'}</button>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {[
                ['all', '전체'],
                ['breakout', '돌파'],
                ['pullback', '눌림'],
                ['squeeze', '수축']
              ].map(([key, label]) => (
                <button key={key} onClick={() => setFilter(key)} style={filter === key ? activeTabBtn : miniBtn}>{label}</button>
              ))}
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
              진행: {progress.current}/{progress.total} {progress.symbol ? `· ${progress.symbol}` : ''}
            </div>
            <div style={{ display: 'grid', gap: 10, maxHeight: 720, overflow: 'auto' }}>
              {filteredStocks.map((stock) => (
                <ListRow key={stock.ticker} stock={stock} selected={selected?.ticker === stock.ticker} onClick={setSelected} />
              ))}
              {!filteredStocks.length && <div style={{ color: '#94a3b8', fontSize: 13 }}>아직 스캔된 종목이 없습니다.</div>}
            </div>
            {showLogs ? (
              <div style={{ marginTop: 14, background: '#09101d', borderRadius: 14, padding: 12, border: '1px solid #1f2937', maxHeight: 200, overflow: 'auto' }}>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>실행 로그</div>
                {logs.map((log, idx) => <div key={`${log}-${idx}`} style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 6 }}>{log}</div>)}
              </div>
            ) : null}
          </aside>

          <main style={{ display: 'grid', gap: 20 }}>
            {selected ? (
              <>
                <div style={{ background: '#0f172a', border: '1px solid #1f2937', borderRadius: 20, padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: 30, fontWeight: 900 }}>{selected.ticker}</div>
                      <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {selected.태그.map((t) => <Tag key={t} text={t} />)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 34, fontWeight: 900 }}>${selected.현재가}</div>
                      <div style={{ color: selected.등락률 >= 0 ? '#22c55e' : '#f87171', marginTop: 6, fontWeight: 700 }}>{selected.등락률}%</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginTop: 18 }}>
                    <ValueCard title="실전 점수" value={selected.매집점수} sub="점수 상위 후보부터 압축" accent="#22c55e" />
                    <ValueCard title="전략 진입가" value={`$${selected.전략진입가}`} sub="눌림 또는 재확인 구간" accent="#38bdf8" />
                    <ValueCard title="손절가" value={`$${selected.손절가}`} sub="이탈 시 빠른 대응" accent="#f87171" />
                    <ValueCard title="2차 목표가" value={`$${selected['2차목표가']}`} sub="과열 시 분할청산 검토" accent="#f59e0b" />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20 }}>
                  <BBChart stock={selected} />

                  <div style={{ background: '#0f172a', border: '1px solid #1f2937', borderRadius: 20, padding: 20 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>핵심 수치</div>
                    <div style={{ display: 'grid', gap: 10 }}>
                      <Metric label="시가 / 고가 / 저가" value={`$${selected.시가} / $${selected.고가} / $${selected.저가}`} />
                      <Metric label="MA5 / MA20 / MA50" value={`${selected.ma5} / ${selected.ma20} / ${selected.ma50}`} />
                      <Metric label="RSI(14)" value={selected.rsi14} />
                      <Metric label="밴드폭" value={`${selected.밴드폭}%`} />
                      <Metric label="볼린저 위치" value={`${selected.밴드위치}%`} />
                      <Metric label="20일선 이격도" value={`${selected.이격도20}%`} />
                      <Metric label="1차 목표가" value={`$${selected['1차목표가']}`} />
                      <Metric label="분석 요약" value={selected.분석요약} multiline />
                    </div>
                  </div>
                </div>

                <div style={{ background: '#0f172a', border: '1px solid #1f2937', borderRadius: 20, padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800 }}>AI 실전 해설</div>
                      <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 6 }}>Groq 키가 없으면 규칙 기반 분석으로 자동 대체됩니다.</div>
                    </div>
                    <button onClick={runAI} disabled={aiLoading} style={primaryBtn}>{aiLoading ? '분석 중...' : 'AI 분석 실행'}</button>
                  </div>
                  <div style={{ marginTop: 16, background: '#09101d', border: '1px solid #1f2937', borderRadius: 16, padding: 16, whiteSpace: 'pre-wrap', lineHeight: 1.7, color: '#e2e8f0', minHeight: 120 }}>
                    {aiText || '아직 AI 분석을 실행하지 않았습니다.'}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ background: '#0f172a', border: '1px solid #1f2937', borderRadius: 20, padding: 30, color: '#94a3b8' }}>
                전체 스캔을 실행하면 상위 종목이 여기에 표시됩니다.
              </div>
            )}
          </main>
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value, multiline = false }) {
  return (
    <div style={{ background: '#09101d', border: '1px solid #1f2937', borderRadius: 12, padding: 12 }}>
      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: multiline ? 13 : 15, lineHeight: multiline ? 1.7 : 1.4, color: '#e5e7eb' }}>{value}</div>
    </div>
  );
}

const primaryBtn = {
  background: '#2563eb',
  color: '#fff',
  border: 'none',
  borderRadius: 12,
  padding: '11px 16px',
  fontWeight: 800,
  cursor: 'pointer'
};
const darkBtn = {
  background: '#111827',
  color: '#e5e7eb',
  border: '1px solid #374151',
  borderRadius: 12,
  padding: '11px 16px',
  fontWeight: 700,
  cursor: 'pointer'
};
const greenBtn = { ...darkBtn, background: '#166534', border: '1px solid #22c55e' };
const inputStyle = {
  flex: 1,
  background: '#09101d',
  color: '#fff',
  border: '1px solid #374151',
  borderRadius: 12,
  padding: '11px 14px',
  outline: 'none'
};
const chipStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  background: '#09101d',
  border: '1px solid #1f2937',
  borderRadius: 999,
  padding: '6px 10px',
  fontSize: 12,
  fontWeight: 700
};
const chipCloseBtn = {
  background: 'transparent',
  color: '#94a3b8',
  border: 'none',
  cursor: 'pointer',
  fontSize: 14,
  padding: 0
};
const miniBtn = {
  background: '#111827',
  color: '#cbd5e1',
  border: '1px solid #374151',
  borderRadius: 10,
  padding: '7px 11px',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 700
};
const activeTabBtn = { ...miniBtn, background: '#1d4ed8', border: '1px solid #3b82f6', color: '#fff' };
