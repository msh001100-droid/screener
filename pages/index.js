import { useEffect, useMemo, useState } from "react";
import BBChart from "../components/BBChart";
import { DEFAULT_WATCHLIST } from "../lib/universe";

function tagStyle(tag) {
  const colorMap = {
    "뉴스": "#2563eb",
    "거래량": "#7c3aed",
    "돌파": "#059669",
    "강돌파": "#dc2626",
    "수축": "#0f766e",
    "눌림": "#d97706",
    "과열": "#b91c1c",
    "오류": "#6b7280"
  };
  const color = colorMap[tag] || "#374151";
  return {
    display: "inline-block",
    padding: "4px 8px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    color,
    border: `1px solid ${color}33`,
    background: `${color}12`
  };
}

function StatCard({ title, value, sub, color }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 14 }}>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || "#111827" }}>{value}</div>
      {sub ? <div style={{ marginTop: 6, fontSize: 11, color: "#9ca3af" }}>{sub}</div> : null}
    </div>
  );
}

function SearchRow({ item, onAdd }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
      <div>
        <div style={{ fontWeight: 800 }}>{item.symbol}</div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>{item.description || "미국 주식"}</div>
      </div>
      <button
        onClick={() => onAdd(item.symbol)}
        style={{ background: "#111827", color: "#fff", border: 0, borderRadius: 10, padding: "10px 12px", fontWeight: 800 }}
      >
        추가
      </button>
    </div>
  );
}

function ScanRow({ item, selected, onSelect }) {
  return (
    <div
      onClick={() => onSelect(item)}
      style={{
        display: "grid",
        gridTemplateColumns: "110px 90px 90px 90px 1fr",
        gap: 10,
        alignItems: "center",
        background: selected ? "#eef6ff" : "#fff",
        border: selected ? "1px solid #93c5fd" : "1px solid #e5e7eb",
        borderRadius: 14,
        padding: 12
      }}
    >
      <div>
        <div style={{ fontWeight: 900, fontSize: 18 }}>{item.ticker}</div>
        <div style={{ fontSize: 11, color: "#6b7280" }}>점수 {item.score}</div>
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
        <div style={{ fontSize: 12, color: "#6b7280" }}>RVOL</div>
        <div style={{ fontWeight: 800 }}>{item.rvol ?? "-"}</div>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {(item.tags || []).map((tag) => (
          <span key={tag} style={tagStyle(tag)}>{tag}</span>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const [searchInput, setSearchInput] = useState("");
  const [searchItems, setSearchItems] = useState([]);
  const [watchlist, setWatchlist] = useState(DEFAULT_WATCHLIST);
  const [scanItems, setScanItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [maxSymbols, setMaxSymbols] = useState(6);
  const [live, setLive] = useState(false);
  const [message, setMessage] = useState("");
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingScan, setLoadingScan] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("centro-watchlist-clean");
    if (raw) {
      try {
        setWatchlist(JSON.parse(raw));
      } catch (error) {
        // ignore bad local storage
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("centro-watchlist-clean", JSON.stringify(watchlist));
    }
  }, [watchlist]);

  useEffect(() => {
    if (!live || !selected || !selected.ticker) return;
    const timer = setInterval(async () => {
      const res = await fetch(`/api/quote?symbol=${selected.ticker}`);
      const json = await res.json();
      if (json.ok && json.data) {
        setSelected(json.data);
        setScanItems((prev) => prev.map((x) => x.ticker === json.data.ticker ? json.data : x));
      }
    }, 15000);
    return () => clearInterval(timer);
  }, [live, selected]);

  async function handleSearch() {
    try {
      setLoadingSearch(true);
      setMessage("검색 중...");
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchInput)}`);
      const json = await res.json();
      setSearchItems(json.items || []);
      setMessage(json.items?.length ? `검색 결과 ${json.items.length}개` : "검색 결과가 없습니다.");
    } catch (error) {
      setMessage(error.message || "검색 실패");
      setSearchItems([]);
    } finally {
      setLoadingSearch(false);
    }
  }

  async function addTicker(symbol) {
    const ticker = String(symbol || "").trim().toUpperCase();
    if (!ticker) return;
    if (!watchlist.includes(ticker)) {
      setWatchlist((prev) => [...prev, ticker]);
    }
    setMessage(`${ticker} 추가 완료`);
  }

  function removeTicker(symbol) {
    const ticker = String(symbol || "").trim().toUpperCase();
    setWatchlist((prev) => prev.filter((x) => x !== ticker));
    if (selected && selected.ticker === ticker) {
      setSelected(null);
    }
    setMessage(`${ticker} 제거 완료`);
  }

  async function runWatchlistScan() {
    try {
      setLoadingScan(true);
      setMessage("워치리스트 스캔 중...");
      const res = await fetch(`/api/scan?symbols=${encodeURIComponent(watchlist.join(","))}&maxSymbols=${maxSymbols}`);
      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error || "스캔 실패");
      }
      setScanItems(json.items || []);
      setSelected((json.items || [])[0] || null);
      setMessage(`스캔 완료: ${json.items?.length || 0}개 (조회 ${json.scanned || 0}종목)`);
    } catch (error) {
      setMessage(error.message || "스캔 실패");
      setScanItems([]);
    } finally {
      setLoadingScan(false);
    }
  }

  const watchlistSummary = useMemo(() => watchlist.join(", "), [watchlist]);

  return (
    <div style={{ maxWidth: 1450, margin: "0 auto", padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 30, fontWeight: 900 }}>📈 Nasdaq Screener Centro Clean</div>
          <div style={{ marginTop: 8, color: "#6b7280" }}>오류 로그를 기준으로 다시 만든 안정형 버전</div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => setLive((prev) => !prev)}
            style={{ background: live ? "#065f46" : "#111827", color: "#fff", border: 0, borderRadius: 12, padding: "12px 16px", fontWeight: 800 }}
          >
            {live ? "LIVE ON" : "LIVE OFF"}
          </button>
          <a
            href={selected?.ticker ? `https://www.tradingview.com/symbols/NASDAQ-${selected.ticker}/` : "https://www.tradingview.com/"}
            target="_blank"
            rel="noreferrer"
            style={{ background: "#1d4ed8", color: "#fff", borderRadius: 12, padding: "12px 16px", fontWeight: 800 }}
          >
            TradingView
          </a>
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 16, marginBottom: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 160px 180px auto auto", gap: 10, alignItems: "end" }}>
          <div>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>티커 검색</div>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              placeholder="예: QUBT, RGTI, SOUN"
              style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>스캔 개수</div>
            <input
              type="number"
              min="1"
              max="8"
              value={maxSymbols}
              onChange={(e) => setMaxSymbols(Number(e.target.value || 6))}
              style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>현재 워치리스트</div>
            <div style={{ padding: 12, borderRadius: 12, border: "1px solid #e5e7eb", background: "#f9fafb", fontSize: 13 }}>
              {watchlistSummary}
            </div>
          </div>
          <button
            onClick={handleSearch}
            style={{ background: "#111827", color: "#fff", border: 0, borderRadius: 12, padding: "12px 16px", fontWeight: 800 }}
          >
            {loadingSearch ? "검색중" : "검색"}
          </button>
          <button
            onClick={runWatchlistScan}
            style={{ background: "#dc2626", color: "#fff", border: 0, borderRadius: 12, padding: "12px 16px", fontWeight: 800 }}
          >
            {loadingScan ? "스캔중" : "워치리스트 스캔"}
          </button>
        </div>
        <div style={{ marginTop: 12, fontSize: 13, color: "#6b7280" }}>{message}</div>
      </div>

      {!!searchItems.length && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>검색 결과</div>
          <div style={{ display: "grid", gap: 10 }}>
            {searchItems.map((item) => (
              <SearchRow key={item.symbol} item={item} onAdd={addTicker} />
            ))}
          </div>
        </div>
      )}

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 16, marginBottom: 18 }}>
        <div style={{ fontWeight: 800, marginBottom: 10 }}>워치리스트 관리</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {watchlist.map((ticker) => (
            <span key={ticker} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 999, border: "1px solid #e5e7eb", background: "#f9fafb", fontWeight: 700, fontSize: 13 }}>
              {ticker}
              <button onClick={() => removeTicker(ticker)} style={{ border: 0, background: "transparent", color: "#dc2626", fontWeight: 900 }}>
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>스캔 결과</div>
          <div style={{ display: "grid", gap: 10 }}>
            {scanItems.map((item) => (
              <ScanRow key={item.ticker} item={item} selected={selected?.ticker === item.ticker} onSelect={setSelected} />
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gap: 18 }}>
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 16 }}>
            {selected ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 900 }}>{selected.ticker}</div>
                    <div style={{ color: "#6b7280", fontSize: 13 }}>실전용 후보 압축 정보</div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 12 }}>
                  <StatCard title="현재가" value={`$${selected.price.toFixed(2)}`} />
                  <StatCard title="등락률" value={`${selected.changePct.toFixed(2)}%`} color={selected.changePct >= 0 ? "#dc2626" : "#2563eb"} />
                  <StatCard title="점수" value={selected.score} sub={`RVOL ${selected.rvol}`} color="#7c3aed" />
                  <StatCard title="R:R" value={selected.rr} sub={`RSI ${selected.rsi14}`} color="#059669" />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 12 }}>
                  <StatCard title="진입가" value={`$${selected.entry}`} />
                  <StatCard title="손절가" value={`$${selected.stop}`} color="#2563eb" />
                  <StatCard title="1차 목표" value={`$${selected.target1}`} color="#d97706" />
                  <StatCard title="2차 목표" value={`$${selected.target2}`} color="#dc2626" />
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                  {selected.tags.map((tag) => (
                    <span key={tag} style={tagStyle(tag)}>{tag}</span>
                  ))}
                </div>

                <BBChart stock={selected} />

                <div style={{ marginTop: 16, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 14, padding: 14 }}>
                  <div style={{ fontWeight: 800, marginBottom: 8 }}>최근 뉴스</div>
                  {selected.news?.length ? (
                    <div style={{ display: "grid", gap: 10 }}>
                      {selected.news.map((n, idx) => (
                        <a key={idx} href={n.url || "#"} target="_blank" rel="noreferrer" style={{ display: "block", padding: 10, borderRadius: 10, background: "#fff", border: "1px solid #e5e7eb" }}>
                          <div style={{ fontWeight: 700 }}>{n.headline || "뉴스"}</div>
                          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{n.source || "source"}</div>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 14, color: "#6b7280" }}>최근 뉴스가 없습니다.</div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ color: "#6b7280" }}>왼쪽에서 스캔 결과를 선택하세요.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
