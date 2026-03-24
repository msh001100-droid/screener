import { useEffect, useMemo, useState } from "react";
import BBChart from "../components/BBChart";
import { PRESETS } from "../lib/universe";

const DEFAULT_WATCHLIST = ["SOUN","BBAI","QUBT","RGTI","IONQ","MARA","ASTS","SMR"];

function tagStyle(tag) {
  const colors = {
    "뉴스": "#2563eb",
    "거래량": "#7c3aed",
    "돌파": "#059669",
    "강돌파": "#dc2626",
    "수축": "#0f766e",
    "눌림": "#d97706",
    "과열": "#b91c1c",
    "오류": "#6b7280"
  };
  const color = colors[tag] || "#374151";
  return {
    display: "inline-block",
    padding: "4px 8px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    color,
    background: color + "18",
    border: `1px solid ${color}35`
  };
}

function StatCard({ title, value, sub, color = "#1f2937" }) {
  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: 14, border: "1px solid #e5e7eb", minWidth: 120 }}>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      {sub ? <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>{sub}</div> : null}
    </div>
  );
}

function Row({ item, selected, onSelect, onAdd }) {
  return (
    <div
      onClick={() => onSelect(item)}
      style={{
        background: selected ? "#eef6ff" : "#fff",
        border: selected ? "1px solid #93c5fd" : "1px solid #e5e7eb",
        borderRadius: 14,
        padding: 14,
        display: "grid",
        gridTemplateColumns: "100px 90px 90px 110px 1fr 90px",
        gap: 12,
        alignItems: "center"
      }}
    >
      <div>
        <div style={{ fontSize: 18, fontWeight: 800 }}>{item.ticker || item.symbol}</div>
        <div style={{ fontSize: 11, color: "#6b7280" }}>{item.description || "미국 주식"}</div>
      </div>
      <div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>현재가</div>
        <div style={{ fontWeight: 800 }}>${item.price?.toFixed ? item.price.toFixed(2) : "-"}</div>
      </div>
      <div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>등락률</div>
        <div style={{ fontWeight: 800, color: item.changePct >= 0 ? "#dc2626" : "#2563eb" }}>
          {item.changePct?.toFixed ? item.changePct.toFixed(2) : "-"}%
        </div>
      </div>
      <div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>점수 / RVOL</div>
        <div style={{ fontWeight: 800 }}>{item.score ?? "-"} / {item.rvol ?? "-"}</div>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {(item.tags || []).slice(0, 5).map((tag) => <span key={tag} style={tagStyle(tag)}>{tag}</span>)}
      </div>
      <div style={{ textAlign: "right" }}>
        {onAdd ? (
          <button
            onClick={(e) => { e.stopPropagation(); onAdd(item.symbol || item.ticker); }}
            style={{ background: "#111827", color: "#fff", border: 0, borderRadius: 10, padding: "10px 12px", fontWeight: 700 }}
          >
            추가
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function Home() {
  const [watchlist, setWatchlist] = useState(DEFAULT_WATCHLIST);
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [preset, setPreset] = useState("전체 후보");
  const [searchInput, setSearchInput] = useState("");
  const [searchItems, setSearchItems] = useState([]);
  const [loadingScan, setLoadingScan] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [message, setMessage] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [live, setLive] = useState(false);
  const [minScore, setMinScore] = useState(35);
  const [priceMin, setPriceMin] = useState(0.5);
  const [priceMax, setPriceMax] = useState(30);
  const [newsOnly, setNewsOnly] = useState(false);
  const [breakoutOnly, setBreakoutOnly] = useState(false);
  const [pullbackOnly, setPullbackOnly] = useState(false);
  const [maxSymbols, setMaxSymbols] = useState(8);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("centroWatchlistV2") : "";
    if (saved) {
      try { setWatchlist(JSON.parse(saved)); } catch {}
    }
    runScan();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("centroWatchlistV2", JSON.stringify(watchlist));
    }
  }, [watchlist]);

  useEffect(() => {
    if (!live || !selected?.ticker) return;
    const timer = setInterval(async () => {
      const res = await fetch(`/api/quote?symbol=${selected.ticker}`);
      const json = await res.json();
      if (json.ok && json.data) {
        setSelected(json.data);
        setResults((prev) => prev.map((x) => x.ticker === json.data.ticker ? json.data : x));
      }
    }, 15000);
    return () => clearInterval(timer);
  }, [live, selected?.ticker]);

  async function runScan(customSymbols = []) {
    try {
      setLoadingScan(true);
      setMessage("후보군 스캔 중...");
      const qs = new URLSearchParams({
        preset,
        minScore: String(minScore),
        priceMin: String(priceMin),
        priceMax: String(priceMax),
        newsOnly: String(newsOnly),
        breakoutOnly: String(breakoutOnly),
        pullbackOnly: String(pullbackOnly),
        maxSymbols: String(maxSymbols)
      });
      if (customSymbols.length) qs.set("symbols", customSymbols.join(","));
      const res = await fetch(`/api/scan?${qs.toString()}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "스캔 실패");
      setResults(json.items || []);
      setSelected((prev) => (json.items || []).find((x) => x.ticker === prev?.ticker) || (json.items || [])[0] || null);
      setMessage(`스캔 완료: ${json.count}개 (조회 ${json.scanned || 0}종목${json.cached ? ", 캐시 사용" : ""})`);
    } catch (e) {
      setMessage(e.message || "스캔 실패");
      setResults([]);
    } finally {
      setLoadingScan(false);
    }
  }

  async function searchTicker() {
    try {
      setLoadingSearch(true);
      setMessage("검색 중...");
      setAnalysis("");
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchInput)}`);
      const json = await res.json();
      setSearchItems(json.items || []);
      setMessage(json.items?.length ? `검색 결과 ${json.items.length}개` : "검색 결과가 없습니다.");
    } catch (e) {
      setMessage(e.message || "검색 실패");
      setSearchItems([]);
    } finally {
      setLoadingSearch(false);
    }
  }

  async function addTicker(symbol) {
    const ticker = String(symbol || "").trim().toUpperCase();
    if (!ticker) return;
    if (!watchlist.includes(ticker)) setWatchlist((prev) => [...prev, ticker]);
    const res = await fetch(`/api/quote?symbol=${ticker}`);
    const json = await res.json();
    if (json.ok && json.data) {
      setSelected(json.data);
      setResults((prev) => {
        const exists = prev.some((x) => x.ticker === ticker);
        const next = exists ? prev.map((x) => x.ticker === ticker ? json.data : x) : [json.data, ...prev];
        return next.sort((a, b) => b.score - a.score);
      });
      setMessage(`${ticker} 추가 완료`);
    } else {
      setMessage(json.error || "종목 추가 실패");
    }
  }


  function removeTicker(symbol) {
    const ticker = String(symbol || "").trim().toUpperCase();
    setWatchlist((prev) => prev.filter((x) => x !== ticker));
    setMessage(`${ticker} 워치리스트 제거`);
  }

  async function runAnalysis() {
    if (!selected) return;
    setAnalysis("분석 중...");
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stock: selected })
    });
    const json = await res.json();
    setAnalysis(json.ok ? json.text : (json.error || "분석 실패"));
  }

  const watchlistView = useMemo(() => watchlist.slice(0, 12).join(", ") + (watchlist.length > 12 ? " ..." : ""), [watchlist]);

  return (
    <div style={{ maxWidth: 1500, margin: "0 auto", padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 30, fontWeight: 900 }}>📈 Centro Pro v2.0 나스닥 급등주 스크리너</div>
          <div style={{ marginTop: 8, color: "#6b7280" }}>검색 + 자동 후보 발굴 + 워치리스트 + 실전 전략 카드</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <a
            href={selected?.ticker ? `https://www.tradingview.com/symbols/NASDAQ-${selected.ticker}/` : "https://www.tradingview.com/"}
            target="_blank"
            rel="noreferrer"
            style={{ background: "#1d4ed8", color: "#fff", padding: "12px 14px", borderRadius: 12, fontWeight: 800 }}
          >
            TradingView 열기
          </a>
          <button
            onClick={() => setLive((v) => !v)}
            style={{ background: live ? "#065f46" : "#111827", color: "#fff", padding: "12px 14px", borderRadius: 12, fontWeight: 800, border: 0 }}
          >
            {live ? "LIVE ON" : "LIVE OFF"}
          </button>
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 18, padding: 16, marginBottom: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr 1fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
          <div>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>티커 검색</div>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchTicker()}
              placeholder="예: QUBT, RGTI, SOUN"
              style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>프리셋</div>
            <select value={preset} onChange={(e) => setPreset(e.target.value)} style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }}>
              {Object.keys(PRESETS).map((k) => <option key={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>최소 점수</div>
            <input type="number" value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>최소 가격</div>
            <input type="number" step="0.1" value={priceMin} onChange={(e) => setPriceMin(Number(e.target.value))} style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>최대 가격</div>
            <input type="number" step="0.1" value={priceMax} onChange={(e) => setPriceMax(Number(e.target.value))} style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>스캔 개수</div>
            <input type="number" min="1" max="8" value={maxSymbols} onChange={(e) => setMaxSymbols(Number(e.target.value || 8))} style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }} />
          </div>
          <div style={{ display: "flex", gap: 8, flexDirection: "column", justifyContent: "center", paddingBottom: 6 }}>
            <label style={{ fontSize: 12 }}><input type="checkbox" checked={newsOnly} onChange={(e) => setNewsOnly(e.target.checked)} /> 뉴스만</label>
            <label style={{ fontSize: 12 }}><input type="checkbox" checked={breakoutOnly} onChange={(e) => setBreakoutOnly(e.target.checked)} /> 돌파만</label>
            <label style={{ fontSize: 12 }}><input type="checkbox" checked={pullbackOnly} onChange={(e) => setPullbackOnly(e.target.checked)} /> 눌림만</label>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={searchTicker} style={{ background: "#111827", color: "#fff", border: 0, borderRadius: 12, padding: "12px 16px", fontWeight: 800 }}>
              {loadingSearch ? "검색중" : "검색"}
            </button>
            <button onClick={() => runScan()} style={{ background: "#dc2626", color: "#fff", border: 0, borderRadius: 12, padding: "12px 16px", fontWeight: 800 }}>
              {loadingScan ? "스캔중" : "자동 스캔"}
            </button>
            <button onClick={() => runScan(watchlist)} style={{ background: "#2563eb", color: "#fff", border: 0, borderRadius: 12, padding: "12px 16px", fontWeight: 800 }}>
              워치리스트 스캔
            </button>
          </div>
        </div>
        <div style={{ marginTop: 12, fontSize: 13, color: "#6b7280" }}>{message}</div>
      </div>

      {!!searchItems.length && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>검색 결과</div>
          <div style={{ display: "grid", gap: 10 }}>
            {searchItems.map((item) => (
              <Row key={item.symbol} item={item} onSelect={() => addTicker(item.symbol)} onAdd={addTicker} />
            ))}
          </div>
        </div>
      )}


      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 18, padding: 16, marginBottom: 18 }}>
        <div style={{ fontWeight: 800, marginBottom: 10 }}>워치리스트 관리</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {watchlist.map((ticker) => (
            <span key={ticker} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "#f3f4f6", borderRadius: 999, border: "1px solid #e5e7eb", fontSize: 13, fontWeight: 700 }}>
              {ticker}
              <button onClick={() => removeTicker(ticker)} style={{ border: 0, background: "transparent", color: "#dc2626", fontWeight: 900 }}>×</button>
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 18 }}>
        <div style={{ display: "grid", gap: 18 }}>
          <div>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>스캔 결과</div>
            <div style={{ display: "grid", gap: 10 }}>
              {results.map((item) => (
                <Row key={item.ticker} item={item} selected={selected?.ticker === item.ticker} onSelect={setSelected} />
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 18 }}>
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 18, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 900 }}>{selected?.ticker || "선택 없음"}</div>
                <div style={{ fontSize: 13, color: "#6b7280" }}>워치리스트: {watchlistView}</div>
              </div>
              {selected ? (
                <button onClick={runAnalysis} style={{ background: "#111827", color: "#fff", border: 0, borderRadius: 12, padding: "12px 16px", fontWeight: 800 }}>
                  AI/규칙 분석
                </button>
              ) : null}
            </div>

            {selected ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
                  <StatCard title="현재가" value={`$${selected.price.toFixed(2)}`} color="#111827" />
                  <StatCard title="등락률" value={`${selected.changePct.toFixed(2)}%`} color={selected.changePct >= 0 ? "#dc2626" : "#2563eb"} />
                  <StatCard title="점수" value={selected.score} sub={`RVOL ${selected.rvol}`} color="#7c3aed" />
                  <StatCard title="R:R" value={selected.rr} sub={`RSI ${selected.rsi14}`} color="#059669" />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
                  <StatCard title="진입가" value={`$${selected.entry}`} color="#111827" />
                  <StatCard title="손절가" value={`$${selected.stop}`} color="#2563eb" />
                  <StatCard title="1차 목표" value={`$${selected.target1}`} color="#d97706" />
                  <StatCard title="2차 목표" value={`$${selected.target2}`} color="#dc2626" />
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                  {selected.tags.map((tag) => <span key={tag} style={tagStyle(tag)}>{tag}</span>)}
                </div>

                <BBChart stock={selected} />

                <div style={{ marginTop: 16, background: "#f9fafb", borderRadius: 14, padding: 14, border: "1px solid #e5e7eb" }}>
                  <div style={{ fontWeight: 800, marginBottom: 8 }}>전략 메모</div>
                  <div style={{ fontSize: 14, lineHeight: 1.65, color: "#374151" }}>
                    {analysis || "분석 버튼을 누르면 현재 종목에 대한 규칙 기반 전략 메모가 생성됩니다."}
                  </div>
                </div>

                <div style={{ marginTop: 16, background: "#fff", borderRadius: 14, padding: 14, border: "1px solid #e5e7eb" }}>
                  <div style={{ fontWeight: 800, marginBottom: 8 }}>최근 뉴스</div>
                  {selected.news?.length ? (
                    <div style={{ display: "grid", gap: 10 }}>
                      {selected.news.map((n, idx) => (
                        <a key={idx} href={n.url} target="_blank" rel="noreferrer" style={{ padding: 12, borderRadius: 10, border: "1px solid #e5e7eb", background: "#fafafa" }}>
                          <div style={{ fontWeight: 700 }}>{n.headline}</div>
                          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{n.source}</div>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 14, color: "#6b7280" }}>최근 뉴스가 없습니다.</div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 14, color: "#6b7280" }}>왼쪽에서 종목을 선택하세요.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
