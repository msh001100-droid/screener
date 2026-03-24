import { useEffect, useMemo, useRef, useState } from 'react';
import BBChart from '../components/BBChart';
import { buildStock, filterStocksByPreset } from '../lib/calc';

const DEFAULT_TICKERS = ['SOUN', 'BBAI', 'MARA', 'RIOT', 'QBTS', 'IONQ', 'RGTI', 'KULR', 'PLUG', 'ASTS', 'RKLB', 'CLOV'];
const REQUEST_GAP = 350;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fmt(value, digits = 2) {
  if (value == null || Number.isNaN(value)) return '-';
  return Number(value).toLocaleString('en-US', { maximumFractionDigits: digits });
}

function badgeColor(tag) {
  if (tag.includes('강세') || tag.includes('돌파')) return { bg: '#ecfdf3', color: '#067647', bd: '#abefc6' };
  if (tag.includes('뉴스')) return { bg: '#eef4ff', color: '#155eef', bd: '#cfe0ff' };
  if (tag.includes('과열')) return { bg: '#fff6ed', color: '#c4320a', bd: '#f9dbaf' };
  return { bg: '#f8fafc', color: '#344054', bd: '#d0d5dd' };
}

function StatCard({ title, value, sub, color = '#101828' }) {
  return (
    <div className="card statCard" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="small">{title}</div>
      <div className="mono statValue" style={{ color }}>{value}</div>
      {sub ? <div className="small" style={{ marginTop: 6 }}>{sub}</div> : null}
    </div>
  );
}

export default function Home() {
  const [watchlist, setWatchlist] = useState(DEFAULT_TICKERS);
  const [stocks, setStocks] = useState([]);
  const [selected, setSelected] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('대기 중');
  const [preset, setPreset] = useState('all');
  const [live, setLive] = useState(false);
  const [minScore, setMinScore] = useState(0);
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const liveRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('centro-watchlist-v14');
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length) setWatchlist(parsed);
    } catch {
      // ignore broken storage
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('centro-watchlist-v14', JSON.stringify(watchlist));
    }
  }, [watchlist]);

  async function fetchJson(url, options) {
    const response = await fetch(url, options);
    const json = await response.json();
    if (!json.ok) throw new Error(json.error || '요청 실패');
    return json.data ?? json;
  }

  async function scan() {
    setLoading(true);
    setStatus('스캔 시작');
    setAiText('');
    const next = [];

    for (let i = 0; i < watchlist.length; i += 1) {
      const ticker = watchlist[i];
      setStatus(`스캔 중 ${i + 1}/${watchlist.length} - ${ticker}`);
      try {
        const [quote, candles, news] = await Promise.all([
          fetchJson(`/api/quote?symbol=${ticker}`),
          fetchJson(`/api/candles?symbol=${ticker}`),
          fetchJson(`/api/news?symbol=${ticker}`),
        ]);
        const stock = buildStock(ticker, quote, candles, news);
        next.push(stock);
      } catch (error) {
        console.error(ticker, error);
      }
      await wait(REQUEST_GAP);
    }

    const sorted = next.sort((a, b) => b.score - a.score);
    setStocks(sorted);
    setSelected((prev) => sorted.find((item) => item.ticker === prev?.ticker) || sorted[0] || null);
    setStatus(`완료 - ${sorted.length}개 종목 분석`);
    setLoading(false);
  }

  useEffect(() => {
    scan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!live || !selected?.ticker) {
      if (liveRef.current) clearInterval(liveRef.current);
      return undefined;
    }

    liveRef.current = setInterval(async () => {
      try {
        const quote = await fetchJson(`/api/quote?symbol=${selected.ticker}`);
        const updated = buildStock(selected.ticker, quote, selected.candles || [], selected.news || []);
        setStocks((prev) => prev.map((row) => (row.ticker === updated.ticker ? { ...row, ...updated, candles: row.candles, news: row.news } : row)).sort((a, b) => b.score - a.score));
        setSelected((prev) => (prev?.ticker === updated.ticker ? { ...prev, ...updated, candles: prev.candles, news: prev.news } : prev));
      } catch (error) {
        console.error(error);
      }
    }, 15000);

    return () => clearInterval(liveRef.current);
  }, [live, selected]);

  async function addTicker() {
    const ticker = input.trim().toUpperCase();
    if (!ticker) return;
    if (watchlist.includes(ticker)) {
      setInput('');
      return;
    }
    setWatchlist((prev) => [...prev, ticker]);
    setInput('');
  }

  function removeTicker(ticker) {
    setWatchlist((prev) => prev.filter((item) => item !== ticker));
    setStocks((prev) => prev.filter((item) => item.ticker !== ticker));
    if (selected?.ticker === ticker) setSelected(null);
  }

  async function runAI() {
    if (!selected) return;
    setAiLoading(true);
    setAiText('');
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: selected }),
      });
      const json = await response.json();
      if (!json.ok) throw new Error(json.error || 'AI 분석 실패');
      setAiText(json.analysis);
    } catch (error) {
      setAiText(error.message || 'AI 분석 실패');
    } finally {
      setAiLoading(false);
    }
  }

  const filteredStocks = useMemo(() => {
    return filterStocksByPreset(stocks, preset).filter((item) => item.score >= minScore);
  }, [stocks, preset, minScore]);

  const summary = useMemo(() => {
    const base = filteredStocks;
    return {
      count: base.length,
      avgScore: base.length ? Math.round(base.reduce((sum, item) => sum + item.score, 0) / base.length) : 0,
      strongestGap: base.length ? Math.max(...base.map((item) => item.premarketGapPct || 0)) : 0,
      strongestRv: base.length ? Math.max(...base.map((item) => item.rv || 0)) : 0,
    };
  }, [filteredStocks]);

  return (
    <div className="container">
      <div className="card heroCard">
        <div className="heroTop">
          <div>
            <div className="title">📈 Centro Pro v1.4</div>
            <div className="subtitle">프리마켓 전용 화면 + 개장초 돌파 + 눌림목 + 뉴스 촉매 중심의 실전형 나스닥 급등주 스크리너</div>
          </div>
          <div className="buttonRow">
            <button className="primary" onClick={scan} disabled={loading}>{loading ? '스캔 중...' : '전체 스캔'}</button>
            <button className={live ? 'success' : ''} onClick={() => setLive((v) => !v)}>{live ? '📡 LIVE ON' : '📡 LIVE OFF'}</button>
            {selected ? (
              <a href={`https://www.tradingview.com/symbols/NASDAQ-${selected.ticker}/`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                <button>📊 TradingView</button>
              </a>
            ) : null}
          </div>
        </div>

        <div className="controlRow">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="티커 추가 예: QUBT" />
          <button onClick={addTicker}>추가</button>
          <button onClick={() => setWatchlist(DEFAULT_TICKERS)}>기본 복원</button>
          <select value={preset} onChange={(e) => setPreset(e.target.value)}>
            <option value="all">전체 보기</option>
            <option value="premarket">프리마켓 강세</option>
            <option value="breakout">개장초 돌파</option>
            <option value="pullback">눌림목 반등</option>
            <option value="news">뉴스 촉매 우선</option>
          </select>
          <label className="rangeWrap">
            최소 점수 {minScore}
            <input type="range" min="0" max="80" step="5" value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} />
          </label>
          <span className="badge">상태: {status}</span>
        </div>

        <div className="grid fourCols" style={{ marginTop: 14 }}>
          <StatCard title="필터 결과" value={`${summary.count}개`} color="#155eef" />
          <StatCard title="평균 점수" value={`${summary.avgScore}`} color="#7a5af8" />
          <StatCard title="최대 프리마켓 갭" value={`${fmt(summary.strongestGap)}%`} color="#067647" />
          <StatCard title="최대 거래량 배수" value={`${fmt(summary.strongestRv)}x`} color="#c11574" />
        </div>
      </div>

      <div className="grid mainGrid">
        <div className="card leftPanel">
          <div className="panelHeader">실전 후보 압축</div>
          <div className="watchPills">
            {watchlist.map((ticker) => (
              <span key={ticker} className="watchPill">
                {ticker}
                <button onClick={() => removeTicker(ticker)} aria-label={`${ticker} 삭제`}>×</button>
              </span>
            ))}
          </div>

          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th>티커</th>
                  <th>점수</th>
                  <th>갭</th>
                  <th>RVOL</th>
                </tr>
              </thead>
              <tbody>
                {filteredStocks.map((stock) => (
                  <tr key={stock.ticker} onClick={() => { setSelected(stock); setAiText(''); }} className={selected?.ticker === stock.ticker ? 'activeRow' : ''}>
                    <td>
                      <div className="tickerName">{stock.ticker}</div>
                      <div className="small">{fmt(stock.changePct)}%</div>
                    </td>
                    <td className="mono">{stock.score}</td>
                    <td className="mono">{fmt(stock.premarketGapPct)}%</td>
                    <td className="mono">{fmt(stock.rv)}x</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rightPanel">
          {selected ? (
            <>
              <div className="card detailCard">
                <div className="detailTop">
                  <div>
                    <div className="detailTicker">{selected.ticker}</div>
                    <div className="small">실전 우선순위 점수 {selected.score} / 100</div>
                  </div>
                  <div className="tagRow">
                    {selected.tags.map((tag) => {
                      const color = badgeColor(tag);
                      return <span key={tag} className="badge" style={{ background: color.bg, color: color.color, borderColor: color.bd }}>{tag}</span>;
                    })}
                  </div>
                </div>

                <div className="grid fourCols" style={{ marginTop: 16 }}>
                  <StatCard title="현재가" value={`$${fmt(selected.price)}`} color="#155eef" />
                  <StatCard title="등락률" value={`${fmt(selected.changePct)}%`} color={selected.changePct >= 0 ? '#067647' : '#b42318'} />
                  <StatCard title="프리마켓 갭" value={`${fmt(selected.premarketGapPct)}%`} color="#0f8f43" />
                  <StatCard title="거래량 배수" value={`${fmt(selected.rv)}x`} color="#7a5af8" />
                </div>
              </div>

              <div className="grid fourCols">
                <StatCard title="진입가" value={`$${fmt(selected.entry)}`} sub="돌파 확인 후 접근" color="#155eef" />
                <StatCard title="손절가" value={`$${fmt(selected.stop)}`} sub="무너지면 빠르게 정리" color="#d92d20" />
                <StatCard title="1차 목표" value={`$${fmt(selected.target1)}`} sub="부분 익절" color="#0f8f43" />
                <StatCard title="2차 목표" value={`$${fmt(selected.target2)}`} sub="추세 연장" color="#7a5af8" />
              </div>

              <div className="grid twoCols">
                <div className="card" style={{ padding: 16 }}>
                  <div className="panelHeader" style={{ padding: 0, borderBottom: 'none', marginBottom: 10 }}>프리마켓/개장초 체크</div>
                  <div className="grid twoCols">
                    <StatCard title="시가" value={`$${fmt(selected.open)}`} />
                    <StatCard title="전일종가" value={`$${fmt(selected.prevClose)}`} />
                    <StatCard title="당일 변동폭" value={`${fmt(selected.rangePct)}%`} />
                    <StatCard title="R:R" value={`${fmt(selected.rr)} : 1`} />
                  </div>
                </div>
                <div className="card" style={{ padding: 16 }}>
                  <div className="panelHeader" style={{ padding: 0, borderBottom: 'none', marginBottom: 10 }}>핵심 지표</div>
                  <div className="grid twoCols">
                    <StatCard title="MA9" value={selected.ma9 ? `$${fmt(selected.ma9)}` : '-'} />
                    <StatCard title="MA20" value={selected.ma20 ? `$${fmt(selected.ma20)}` : '-'} />
                    <StatCard title="MA50" value={selected.ma50 ? `$${fmt(selected.ma50)}` : '-'} />
                    <StatCard title="RSI" value={fmt(selected.rsi)} />
                  </div>
                </div>
              </div>

              <div className="card" style={{ padding: 16 }}>
                <div className="panelHeader" style={{ padding: 0, borderBottom: 'none', marginBottom: 10 }}>이중 볼린저밴드 차트</div>
                <BBChart stock={selected} />
              </div>

              <div className="grid twoCols">
                <div className="card" style={{ padding: 16 }}>
                  <div className="panelHeader" style={{ padding: 0, borderBottom: 'none', marginBottom: 10 }}>리스크 체크</div>
                  {selected.risk.length ? selected.risk.map((item) => (
                    <div key={item} className="bulletRow">• {item}</div>
                  )) : <div className="small">현재 뚜렷한 경고 신호는 제한적입니다.</div>}
                </div>
                <div className="card" style={{ padding: 16 }}>
                  <div className="panelHeader" style={{ padding: 0, borderBottom: 'none', marginBottom: 10 }}>최근 뉴스 촉매</div>
                  {selected.news?.length ? selected.news.map((item) => (
                    <a key={item.id || item.url} href={item.url} target="_blank" rel="noreferrer" className="newsLink">
                      <div className="newsRow">
                        <div className="newsTitle">{item.headline}</div>
                        <div className="small" style={{ marginTop: 4 }}>{item.source} · {new Date((item.datetime || 0) * 1000).toLocaleString('ko-KR')}</div>
                      </div>
                    </a>
                  )) : <div className="small">최근 뉴스가 없습니다.</div>}
                </div>
              </div>

              <div className="card" style={{ padding: 16 }}>
                <div className="detailTop" style={{ marginBottom: 10 }}>
                  <div className="panelHeader" style={{ padding: 0, borderBottom: 'none' }}>AI / 규칙 기반 해석</div>
                  <button onClick={runAI} disabled={aiLoading}>{aiLoading ? '분석 중...' : '전략 생성'}</button>
                </div>
                <div className="analysisBox">{aiText || '전략 생성 버튼을 누르면 종목별 실전 요약이 생성됩니다.'}</div>
              </div>
            </>
          ) : (
            <div className="card" style={{ padding: 16 }}>종목을 선택하세요.</div>
          )}
        </div>
      </div>
    </div>
  );
}
