import { useState, useEffect, useCallback } from "react";
import BBChart from "../components/BBChart";
import { buildStock } from "../lib/calc";

const TICKERS = [
  "SOUN","FFIE","MULN","ASTS","GSAT",
  "BBAI","MARA","RIOT","NKLA","HOLO",
  "BNGO","KULR","IDEX","CLOV","CIFR",
];

const GC = s =>
  s >= 60 ? "#ff4d4d" : s >= 40 ? "#ffd700" : s >= 20 ? "#00d4ff" : "#4a6080";

// ── 공통 UI ──────────────────────────────────────────────────
function Tag({ c, v }) {
  return (
    <span style={{
      background: c+"22", color: c,
      border: `1px solid ${c}44`,
      borderRadius: 4, padding: "2px 10px",
      fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
    }}>{v}</span>
  );
}

function Cell({ l, v, c, s }) {
  return (
    <div style={{
      background: "#050f1c",
      border: `1px solid ${(c||"#1a3050")}33`,
      borderRadius: 8, padding: "10px 13px",
    }}>
      <div style={{ fontSize: 11, color: "#2a5070", marginBottom: 3 }}>{l}</div>
      <div style={{
        fontSize: 16,
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 700,
        color: c || "#ddeeff",
      }}>{v}</div>
      {s && <div style={{ fontSize: 10, color: "#2a5070", marginTop: 3 }}>{s}</div>}
    </div>
  );
}

function PCard({ l, v, c, s }) {
  return (
    <div style={{
      background: "#030810",
      border: `2px solid ${c}55`,
      borderRadius: 10, padding: "14px 10px", textAlign: "center",
    }}>
      <div style={{ fontSize: 12, color: c, fontWeight: 700, marginBottom: 6 }}>{l}</div>
      <div style={{
        fontSize: 24,
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 700, color: c,
      }}>{v}</div>
      {s && <div style={{ fontSize: 10, color: "#2a5070", marginTop: 6 }}>{s}</div>}
    </div>
  );
}

// ── 메인 페이지 ───────────────────────────────────────────────
export default function Home() {
  const [stocks,  setStocks]  = useState([]);
  const [sel,     setSel]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(0);
  const [total,   setTotal]   = useState(0);
  const [errs,    setErrs]    = useState([]);
  const [updated, setUpdated] = useState("");
  const [input,   setInput]   = useState("");
  const [tab,     setTab]     = useState("시세");
  const [aiText,  setAiText]  = useState("");
  const [aiLoad,  setAiLoad]  = useState(false);
  const [aiErr,   setAiErr]   = useState("");

  // ── 스캔 ─────────────────────────────────────────────────
  const scan = useCallback(async (list) => {
    const tl = list || TICKERS;
    setLoading(true);
    setDone(0);
    setTotal(tl.length);
    setStocks([]);
    setErrs([]);
    setSel(null);

    // 서버 API 경유로 Finnhub 호출 (CORS 완전 해결)
    try {
      const res = await fetch(`/api/quote?symbols=${tl.join(",")}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const out = [];
      for (const ticker of tl) {
        if (json.data[ticker]) {
          out.push(buildStock(ticker, json.data[ticker]));
        } else {
          setErrs(p => [...p, `${ticker}: 데이터 없음`]);
        }
        setDone(p => p + 1);
      }
      const sorted = out.sort((a, b) => b.sc - a.sc);
      setStocks(sorted);
      setUpdated(new Date().toLocaleTimeString("ko-KR"));
      if (sorted.length > 0) setSel(sorted[0]);
    } catch (e) {
      setErrs([`스캔 실패: ${e.message}`]);
    }
    setLoading(false);
  }, []);

  // 앱 시작시 자동 스캔
  useEffect(() => { scan(); }, []); // eslint-disable-line

  // ── 종목 추가 ───────────────────────────────────────────
  async function addTicker() {
    const t = input.trim().toUpperCase();
    if (!t) return;
    setInput("");
    try {
      const res = await fetch(`/api/quote?symbols=${t}`);
      const json = await res.json();
      if (json.data[t]) {
        const s = buildStock(t, json.data[t]);
        setStocks(p => [...p, s].sort((a, b) => b.sc - a.sc));
        setSel(s);
        setTab("시세");
        setAiText(""); setAiErr("");
      } else {
        setErrs(p => [...p, `${t}: 데이터 없음`]);
      }
    } catch (e) {
      setErrs(p => [...p, `${t}: ${e.message}`]);
    }
  }

  // ── AI 분석 ─────────────────────────────────────────────
  async function runAI(s) {
    if (!s) return;
    setAiLoad(true); setAiText(""); setAiErr("");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock: s }),
      });
      if (!res.ok) {
        const d = await res.json();
        setAiErr(d.error || `오류 ${res.status}`);
        return;
      }
      const d = await res.json();
      setAiText(d.text || "응답 없음");
    } catch (e) {
      setAiErr("연결 오류: " + e.message);
    } finally {
      setAiLoad(false);
    }
  }

  function pickStock(s) {
    setSel(s);
    setTab("시세");
    setAiText(""); setAiErr("");
  }

  const TABS = ["시세","볼린저밴드","매집분석","매매가격","AI분석"];
  const pct  = total > 0 ? Math.round(done / total * 100) : 0;

  return (
    <div style={{
      background: "#030912", color: "#ccdde8",
      minHeight: "100vh", display: "flex", flexDirection: "column",
    }}>
      {/* ── 헤더 ── */}
      <header style={{
        background: "#050e1a",
        borderBottom: "1px solid #0c1e30",
        padding: "11px 20px",
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap", gap: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            background: "linear-gradient(135deg,#00ff88,#00d4ff)",
            borderRadius: 8, padding: "4px 14px",
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700, fontSize: 14, color: "#000",
            letterSpacing: 1,
          }}>NASDAQ</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#ddeeff" }}>
              실시간 급등주 스크리너
            </div>
            <div style={{ fontSize: 11, color: "#2a5070" }}>
              이중BB(2σ/1σ) · 세력매집 · 공매도 · AI분석
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {updated && (
            <span style={{
              fontSize: 11, color: "#00ff88",
              fontFamily: "'JetBrains Mono', monospace",
            }}>✅ {updated}</span>
          )}
          <button
            onClick={() => scan()}
            disabled={loading}
            style={{
              background: loading
                ? "#0c1e30"
                : "linear-gradient(135deg,#007a50,#00ff88)",
              border: "none", borderRadius: 8,
              padding: "7px 18px",
              color: loading ? "#2a5070" : "#000",
              fontSize: 13, fontWeight: 700,
            }}
          >
            {loading ? `로딩 ${pct}%` : "🔄 다시 스캔"}
          </button>
        </div>
      </header>

      {/* ── 진행 바 ── */}
      {loading && (
        <div>
          <div style={{ height: 4, background: "#0c1e30" }}>
            <div style={{
              height: "100%", width: `${pct}%`,
              background: "linear-gradient(90deg,#007a50,#00ff88)",
              transition: "width .2s ease",
            }}/>
          </div>
          <div style={{
            padding: "5px 20px", background: "#040c14",
            fontSize: 11, color: "#2a5070",
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {done}/{total} 종목 로딩 중...
          </div>
        </div>
      )}

      {/* ── 에러 ── */}
      {errs.length > 0 && !loading && (
        <div style={{
          padding: "5px 20px",
          background: "#0a0808",
          borderBottom: "1px solid #1a0808",
          fontSize: 11, color: "#ff6666",
        }}>
          ⚠️ {errs.slice(0, 3).join(" | ")}
          {errs.length > 3 && ` 외 ${errs.length - 3}건`}
        </div>
      )}

      {/* ── 바디 ── */}
      <div style={{
        display: "flex", flex: 1, overflow: "hidden",
        height: "calc(100vh - 60px)",
      }}>
        {/* ── 왼쪽 목록 ── */}
        <div style={{
          width: 300, display: "flex", flexDirection: "column",
          borderRight: "1px solid #0c1e30", flexShrink: 0,
        }}>
          {/* 종목 추가 */}
          <div style={{
            padding: "9px 10px", background: "#050e1a",
            borderBottom: "1px solid #0c1e30",
            display: "flex", gap: 7,
          }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && addTicker()}
              placeholder="티커 추가 (Enter)"
              style={{
                flex: 1, background: "#06101c",
                border: "1px solid #0c1e30",
                borderRadius: 7, padding: "7px 11px",
                color: "#ccdde8", fontSize: 12,
                fontFamily: "'JetBrains Mono', monospace",
                outline: "none",
              }}
            />
            <button
              onClick={addTicker}
              style={{
                background: "#00d4ff22",
                border: "1px solid #00d4ff44",
                borderRadius: 7, padding: "7px 12px",
                color: "#00d4ff", fontSize: 12, fontWeight: 700,
              }}
            >+</button>
          </div>

          {/* 컬럼 헤더 */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "56px 1fr 44px 52px",
            padding: "5px 10px", background: "#050e1a",
            borderBottom: "1px solid #0c1e30",
            fontSize: 9, color: "#2a5070", fontWeight: 700,
            letterSpacing: .5,
          }}>
            <span>티커</span>
            <span>BB 구간</span>
            <span style={{ textAlign: "right" }}>변동</span>
            <span style={{ textAlign: "right" }}>매집</span>
          </div>

          {/* 목록 */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {/* 로딩 중 */}
            {loading && stocks.length === 0 && (
              <div style={{ padding: 28, textAlign: "center" }}>
                <div style={{ fontSize: 14, color: "#00ff88", marginBottom: 8, fontWeight: 700 }}>
                  📡 실시간 데이터 수신 중
                </div>
                <div style={{ fontSize: 11, color: "#2a5070", marginBottom: 14 }}>
                  {TICKERS.length}종목 · Finnhub API
                </div>
                <div style={{
                  height: 3, background: "#0c1e30",
                  borderRadius: 4, overflow: "hidden",
                  position: "relative",
                }}>
                  <div style={{
                    position: "absolute", height: "100%", width: "40%",
                    background: "linear-gradient(90deg,#007a50,#00ff88)",
                    animation: "spin 1.2s linear infinite",
                  }}/>
                </div>
              </div>
            )}

            {/* 종목 행 */}
            {stocks.map((s, i) => (
              <div
                key={s.ticker}
                className="row-hover"
                onClick={() => pickStock(s)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "56px 1fr 44px 52px",
                  padding: "9px 10px", alignItems: "center",
                  background: sel?.ticker === s.ticker
                    ? "#0a1d2e"
                    : i % 2 === 0 ? "#050c18" : "#030912",
                  borderLeft: `3px solid ${sel?.ticker === s.ticker ? GC(s.sc) : "transparent"}`,
                  borderBottom: "1px solid #060e18",
                  animation: "fadeIn .2s ease",
                }}
              >
                <div>
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 700, fontSize: 13, color: "#ddeeff",
                  }}>{s.ticker}</div>
                  <div style={{ fontSize: 10, color: "#2a5070", marginTop: 1 }}>
                    ${s.p}
                  </div>
                </div>
                <div style={{
                  fontSize: 10, color: s.zn?.c || "#2a5070",
                  overflow: "hidden", textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {s.zn?.l || "-"}
                </div>
                <div style={{
                  textAlign: "right",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700, fontSize: 12,
                  color: Math.abs(s.ch) <= 3 ? "#00ff88"
                    : s.ch >= 0 ? "#ffd700" : "#ff4d4d",
                }}>
                  {s.ch >= 0 ? "+" : ""}{s.ch}%
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{
                    background: GC(s.sc) + "22",
                    color: GC(s.sc),
                    border: `1px solid ${GC(s.sc)}44`,
                    borderRadius: 5, padding: "2px 7px",
                    fontSize: 12, fontWeight: 700,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>{s.sc}</span>
                </div>
              </div>
            ))}

            {/* 빈 상태 */}
            {!loading && stocks.length === 0 && (
              <div style={{ padding: 24, textAlign: "center" }}>
                <div style={{ fontSize: 13, color: "#ff8888", marginBottom: 10 }}>
                  ❌ 데이터 없음
                </div>
                <div style={{ fontSize: 11, color: "#2a5070", marginBottom: 14, lineHeight: 1.8 }}>
                  API 키를 확인하고<br/>다시 스캔해주세요
                </div>
                <button
                  onClick={() => scan()}
                  style={{
                    background: "#007a5022",
                    border: "1px solid #007a5044",
                    borderRadius: 8, padding: "8px 18px",
                    color: "#00ff88", fontSize: 12, fontWeight: 700,
                  }}
                >🔄 다시 시도</button>
              </div>
            )}
          </div>

          <div style={{
            padding: "7px 12px",
            background: "#030710",
            borderTop: "1px solid #0c1e30",
            fontSize: 11, color: "#2a5070", textAlign: "center",
          }}>
            {stocks.length > 0
              ? `✅ ${stocks.length}종목 실시간 · 매집점수 순`
              : "스캔 대기 중"}
          </div>
        </div>

        {/* ── 오른쪽 상세 ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>

          {/* 로딩 / 대기 */}
          {(loading || !sel) && !stocks.length && (
            <div style={{
              height: "65%", display: "flex",
              alignItems: "center", justifyContent: "center",
              flexDirection: "column", gap: 14,
            }}>
              {loading ? (
                <>
                  <div style={{ fontSize: 32 }}>📡</div>
                  <div style={{ fontSize: 15, color: "#00ff88", fontWeight: 700 }}>
                    Finnhub 실시간 데이터 수신 중
                  </div>
                  <div style={{ fontSize: 12, color: "#2a5070", textAlign: "center", lineHeight: 1.9 }}>
                    서버에서 직접 API 호출 중<br/>
                    CORS 문제 없음 · 잠시만 기다려주세요
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 32 }}>📊</div>
                  <div style={{ fontSize: 15, color: "#2a5070" }}>
                    왼쪽 종목을 클릭하세요
                  </div>
                </>
              )}
            </div>
          )}

          {sel && (
            <div className="fade-in">
              {/* 종목 헤더 */}
              <div style={{
                display: "flex", alignItems: "center",
                gap: 10, marginBottom: 14, flexWrap: "wrap",
              }}>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 26, fontWeight: 700, color: "#ddeeff",
                }}>{sel.ticker}</span>
                {sel.zn && <Tag c={sel.zn.c} v={sel.zn.l}/>}
                <Tag c={sel.gr.c} v={sel.gr.t}/>
                {sel.bb?.bw <= 6 && <Tag c="#ff4d4d" v="밴드수축🚨"/>}
                {sel.ch >= 10   && <Tag c="#ff4d4d" v={`+${sel.ch}% 급등`}/>}
                {Math.abs(sel.ch) <= 3 && <Tag c="#00ff88" v="횡보"/>}
              </div>

              {/* 탭 */}
              <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
                {TABS.map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    style={{
                      padding: "6px 14px",
                      background: tab === t ? "#00d4ff22" : "transparent",
                      border: `1px solid ${tab === t ? "#00d4ff55" : "#0c1e30"}`,
                      borderRadius: 7,
                      color: tab === t ? "#00d4ff" : "#2a5070",
                      fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
                    }}
                  >
                    {t === "시세"      ? "📈 시세"
                    : t === "볼린저밴드" ? "📊 볼린저밴드"
                    : t === "매집분석"  ? "🎯 매집분석"
                    : t === "매매가격"  ? "💰 매매가격"
                    :                    "🤖 AI분석"}
                  </button>
                ))}
              </div>

              {/* ── 시세 탭 ── */}
              {tab === "시세" && (
                <>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 10, marginBottom: 14,
                  }}>
                    <Cell l="현재가" v={`$${sel.p}`} c="#ddeeff"/>
                    <Cell
                      l="변동률"
                      v={`${sel.ch >= 0 ? "+" : ""}${sel.ch}%`}
                      c={Math.abs(sel.ch) <= 3 ? "#00ff88" : sel.ch >= 0 ? "#ffd700" : "#ff4d4d"}
                      s={Math.abs(sel.ch) <= 3 ? "횡보 → 매집 적합" : ""}
                    />
                    <Cell l="고가"   v={`$${sel.h}`} c="#ff9944"/>
                    <Cell l="저가"   v={`$${sel.l}`} c="#00d4ff"/>
                    <Cell
                      l="VWAP"
                      v={`$${sel.vw}`}
                      c={sel.p > sel.vw ? "#00ff88" : "#ff4d4d"}
                      s={sel.p > sel.vw ? "위 ✅ — 매수 우위" : "아래 ❌ — 매도 우위"}
                    />
                    <Cell l="ATR"    v={`$${sel.at}`} c="#aa88ff" s={`${sel.atp}%`}/>
                    <Cell l="BB 구간" v={sel.zn?.l || "-"} c={sel.zn?.c || "#4a6080"}/>
                    <Cell l="BB 신호" v={sel.zn?.s || "-"} c={sel.zn?.c || "#4a6080"}/>
                  </div>
                  <BBChart stock={sel}/>
                </>
              )}

              {/* ── 볼린저밴드 탭 ── */}
              {tab === "볼린저밴드" && (
                <>
                  <BBChart stock={sel}/>
                  <div style={{
                    background: "#060f1c", border: "1px solid #0c1e30",
                    borderRadius: 10, padding: 16,
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#3a6080", marginBottom: 14 }}>
                      수치 상세
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                      <Cell l="BB1 상단(2σ)" v={`$${sel.bb.b1u}`} c="#ff4d4d" s="강한 저항선"/>
                      <Cell l="BB2 상단(1σ)" v={`$${sel.bb.b2u}`} c="#00ff88" s="★ 매수구간 상단"/>
                      <Cell l="SMA"          v={`$${sel.bb.sma}`} c="#ffd700" s="20일 기준선"/>
                      <Cell l="BB2 하단(1σ)" v={`$${sel.bb.b2l}`} c="#ff9944" s="매도구간 상단"/>
                      <Cell l="BB1 하단(2σ)" v={`$${sel.bb.b1l}`} c="#ff4d4d" s="강한 지지선"/>
                      <Cell
                        l="밴드폭"
                        v={`${sel.bb.bw}%`}
                        c={sel.bb.bw <= 6 ? "#ff4d4d" : sel.bb.bw <= 10 ? "#ffd700" : "#00d4ff"}
                        s={sel.bb.bw <= 6 ? "수축! 매집 직전🚨" : sel.bb.bw <= 10 ? "좁아짐" : "정상"}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* ── 매집분석 탭 ── */}
              {tab === "매집분석" && (
                <div style={{
                  background: "#060f1c", border: "1px solid #0c1e30",
                  borderRadius: 10, padding: 16,
                }}>
                  <div style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "center", marginBottom: 14,
                  }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#3a6080" }}>
                      🎯 세력 매집 분석
                    </span>
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 700, fontSize: 18,
                      color: GC(sel.sc),
                    }}>{sel.sc}<span style={{ fontSize: 12, color: "#2a5070" }}>/100</span></span>
                  </div>

                  {sel.sig.length === 0 ? (
                    <div style={{ fontSize: 12, color: "#2a5070", padding: "8px 0" }}>
                      유의미한 신호 없음 — 관망 구간
                    </div>
                  ) : (
                    sel.sig.map((s, i) => (
                      <div key={i} style={{
                        padding: "8px 12px", marginBottom: 7,
                        background: "#00ff8810",
                        border: "1px solid #00ff8822",
                        borderRadius: 8, fontSize: 13, color: "#00ff88",
                      }}>{s}</div>
                    ))
                  )}

                  <div style={{ marginTop: 16, background: "#0c1e30", borderRadius: 4, height: 10 }}>
                    <div style={{
                      width: `${sel.sc}%`, height: "100%", borderRadius: 4,
                      background: `linear-gradient(90deg,${GC(sel.sc)}88,${GC(sel.sc)})`,
                      transition: "width 1s ease",
                    }}/>
                  </div>
                  <div style={{
                    display: "flex", justifyContent: "space-between",
                    fontSize: 10, color: "#2a5070", marginTop: 5,
                  }}>
                    <span>0</span>
                    <span>20 관심</span>
                    <span>40 가능</span>
                    <span>60+ 강력</span>
                  </div>
                </div>
              )}

              {/* ── 매매가격 탭 ── */}
              {tab === "매매가격" && (
                <div style={{
                  background: "#060f1c", border: "1px solid #0c1e30",
                  borderRadius: 10, padding: 16,
                }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#3a6080", marginBottom: 16 }}>
                    💰 실시간 가격 기반 신중한 매매 추천
                  </div>
                  <div style={{
                    display: "grid", gridTemplateColumns: "repeat(4,1fr)",
                    gap: 12, marginBottom: 14,
                  }}>
                    <PCard l="🟢 진입가"   v={`$${sel.en}`} c="#00d4ff" s="VWAP + 0.5%"/>
                    <PCard l="🔴 손절가"   v={`$${sel.st}`} c="#ff4d4d" s={`리스크 $${sel.ri}/주`}/>
                    <PCard l="🎯 1차 목표" v={`$${sel.t1}`} c="#00ff88" s="RR 1:2.5"/>
                    <PCard l="🎯 2차 목표" v={`$${sel.t2}`} c="#ffd700" s="RR 1:4.0"/>
                  </div>
                  <div style={{
                    display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 10, marginBottom: 14,
                  }}>
                    <Cell l="리스크/주"  v={`$${sel.ri}`} c="#ff4d4d"/>
                    <Cell l="1차수익/주" v={`$${(sel.t1 - sel.en).toFixed(2)}`} c="#00ff88"/>
                    <Cell l="RR 비율"   v="1 : 2.5" c="#ffd700"/>
                  </div>
                  <div style={{
                    padding: "12px 14px", background: "#030810",
                    borderRadius: 9, fontSize: 12,
                    color: "#2a5070", lineHeight: 2,
                  }}>
                    <strong style={{ color: "#ffd700" }}>✅ 진입 체크리스트</strong><br/>
                    ☐ BB2상단~BB1상단 구간 (★ 매수 구간) 확인<br/>
                    ☐ VWAP 위 가격 유지 확인<br/>
                    ☐ 변동률 ±3% 이내 횡보 확인<br/>
                    ☐ 손절가 사전 설정 완료 후 진입
                  </div>
                </div>
              )}

              {/* ── AI분석 탭 ── */}
              {tab === "AI분석" && (
                <div style={{
                  background: "#060f1c", border: "1px solid #1a0e30",
                  borderRadius: 10, padding: 18,
                }}>
                  <div style={{
                    display: "flex", alignItems: "center",
                    justifyContent: "space-between", marginBottom: 14,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 18 }}>🤖</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "#aa88ff" }}>
                        AI 종합 분석
                      </span>
                      <Tag c="#aa88ff" v={sel.ticker}/>
                    </div>
                    <button
                      onClick={() => runAI(sel)}
                      disabled={aiLoad}
                      style={{
                        padding: "6px 14px",
                        background: "#6600cc22",
                        border: "1px solid #6600cc55",
                        borderRadius: 7,
                        color: "#aa88ff",
                        fontSize: 12, fontWeight: 700,
                      }}
                    >
                      {aiLoad ? "분석 중..." : "🔄 AI 분석 실행"}
                    </button>
                  </div>

                  {aiLoad && (
                    <div style={{ padding: "16px 0", textAlign: "center" }}>
                      <div style={{ fontSize: 12, color: "#aa88ff", marginBottom: 10 }}>
                        이중BB · 세력매집 · 진입전략 종합 분석 중...
                      </div>
                      <div style={{
                        height: 3, background: "#0c1e30",
                        borderRadius: 4, overflow: "hidden",
                        position: "relative",
                      }}>
                        <div style={{
                          position: "absolute", height: "100%", width: "40%",
                          background: "linear-gradient(90deg,#5500cc,#aa88ff)",
                          animation: "spin 1.2s linear infinite",
                        }}/>
                      </div>
                    </div>
                  )}

                  {aiErr && !aiLoad && (
                    <div style={{
                      background: "#1a0808", borderRadius: 8,
                      padding: 12, fontSize: 12, color: "#ff8888",
                    }}>❌ {aiErr}</div>
                  )}

                  {aiText && !aiLoad && (
                    <div style={{
                      fontSize: 13, color: "#ccdde8",
                      lineHeight: 2.1, whiteSpace: "pre-wrap",
                    }}>{aiText}</div>
                  )}

                  {!aiText && !aiLoad && !aiErr && (
                    <div style={{
                      textAlign: "center", padding: "20px 0",
                      fontSize: 13, color: "#2a5070",
                    }}>
                      위 <strong style={{ color: "#aa88ff" }}>🔄 AI 분석 실행</strong> 버튼을 눌러주세요
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
