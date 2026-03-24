import { useState, useEffect } from "react";
import BBChart from "../components/BBChart";
import { buildStock } from "../lib/calc";

// ── 기본 감시 종목 ────────────────────────────────────────────
const 기본종목 = [
  "SOUN","FFIE","MULN","ASTS","GSAT",
  "BBAI","MARA","RIOT","NKLA","HOLO",
  "BNGO","KULR","IDEX","CLOV","CIFR",
];

const 요청간격 = 300; // Finnhub 분당 60콜 제한 → 300ms 간격 안전

// ── 공통 UI 컴포넌트 ─────────────────────────────────────────
const 매집색 = 점수 =>
  점수 >= 60 ? "#cc0000" : 점수 >= 40 ? "#886600" : 점수 >= 20 ? "#005599" : "#999999";

function 태그({ 색, 내용 }) {
  return (
    <span style={{
      background: 색 + "15", color: 색,
      border: `1px solid ${색}44`,
      borderRadius: 4, padding: "2px 10px",
      fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
    }}>{내용}</span>
  );
}

function 정보칸({ 제목, 값, 색, 설명 }) {
  return (
    <div style={{
      background: "#ffffff", border: "1px solid #dddddd",
      borderLeft: `3px solid ${색 || "#cccccc"}`,
      borderRadius: 8, padding: "10px 14px",
    }}>
      <div style={{ fontSize: 11, color: "#888888", marginBottom: 3 }}>{제목}</div>
      <div style={{
        fontSize: 16, fontFamily: "'JetBrains Mono',monospace",
        fontWeight: 700, color: 색 || "#111111",
      }}>{값}</div>
      {설명 && <div style={{ fontSize: 10, color: "#888888", marginTop: 3 }}>{설명}</div>}
    </div>
  );
}

function 가격카드({ 제목, 값, 색, 설명 }) {
  return (
    <div style={{
      background: "#ffffff",
      border: `2px solid ${색}`,
      borderRadius: 10, padding: "14px 10px", textAlign: "center",
      boxShadow: `0 2px 8px ${색}22`,
    }}>
      <div style={{ fontSize: 12, color: 색, fontWeight: 700, marginBottom: 6 }}>{제목}</div>
      <div style={{
        fontSize: 22, fontFamily: "'JetBrains Mono',monospace",
        fontWeight: 700, color: 색,
      }}>{값}</div>
      {설명 && <div style={{ fontSize: 10, color: "#888888", marginTop: 6 }}>{설명}</div>}
    </div>
  );
}

// ── 메인 페이지 ──────────────────────────────────────────────
export default function 메인() {
  const [종목목록, 종목목록설정] = useState([]);
  const [선택종목, 선택종목설정] = useState(null);
  const [스캔중,   스캔중설정]   = useState(false);
  const [현재티커, 현재티커설정] = useState("");
  const [완료수,   완료수설정]   = useState(0);
  const [전체수,   전체수설정]   = useState(0);
  const [로그,     로그설정]     = useState([]);
  const [로그표시, 로그표시설정] = useState(false);
  const [업데이트, 업데이트설정] = useState("");
  const [입력값,   입력값설정]   = useState("");
  const [탭,       탭설정]       = useState("시세");
  const [AI분석,   AI분석설정]   = useState("");
  const [AI로딩,   AI로딩설정]   = useState(false);
  const [AI오류,   AI오류설정]   = useState("");

  // ── 스캔 함수 ──────────────────────────────────────────────
  async function 스캔(티커목록) {
    const 목록 = 티커목록 || 기본종목;
    스캔중설정(true);
    완료수설정(0);
    전체수설정(목록.length);
    종목목록설정([]);
    로그설정([]);
    선택종목설정(null);
    AI분석설정("");

    const 로드된종목 = [];

    for (let i = 0; i < 목록.length; i++) {
      const 티커 = 목록[i];
      현재티커설정(티커);

      try {
        const 응답 = await fetch(`/api/quote?symbol=${티커}`);
        const json = await 응답.json();

        // ★ 반드시 json.data를 buildStock에 전달
        if (json.ok && json.data && json.data.c > 0) {
          const 종목 = buildStock(티커, json.data);
          if (종목) {
            로드된종목.push(종목);
            // 로드 즉시 목록 업데이트 (매집점수 내림차순)
            종목목록설정([...로드된종목].sort((a, b) => b.매집점수 - a.매집점수));
            로그설정(p => [...p, { 시간: new Date().toTimeString().slice(0,8), 내용: `${티커}: $${json.data.c} ✅`, 성공: true }]);
          }
        } else {
          로그설정(p => [...p, { 시간: new Date().toTimeString().slice(0,8), 내용: `${티커}: ❌ ${json.error || "데이터 없음"}`, 성공: false }]);
        }
      } catch (e) {
        로그설정(p => [...p, { 시간: new Date().toTimeString().slice(0,8), 내용: `${티커}: ❌ 오류 ${e.message}`, 성공: false }]);
      }

      완료수설정(i + 1);

      // 다음 요청 전 대기 (Rate Limit 방지)
      if (i < 목록.length - 1) {
        await new Promise(r => setTimeout(r, 요청간격));
      }
    }

    // 완료 처리
    const 정렬목록 = [...로드된종목].sort((a, b) => b.매집점수 - a.매집점수);
    if (정렬목록.length > 0) 선택종목설정(정렬목록[0]);
    업데이트설정(new Date().toLocaleTimeString("ko-KR"));
    현재티커설정("");
    스캔중설정(false);
    if (로드된종목.length === 0) 로그표시설정(true);
  }

  // 앱 시작 시 자동 스캔
  useEffect(() => { 스캔(); }, []); // eslint-disable-line

  // ── 종목 추가 ────────────────────────────────────────────────
  async function 종목추가() {
    const 티커 = 입력값.trim().toUpperCase();
    if (!티커) return;
    입력값설정("");
    현재티커설정(티커);
    try {
      const 응답 = await fetch(`/api/quote?symbol=${티커}`);
      const json = await 응답.json();
      if (json.ok && json.data && json.data.c > 0) {
        const 종목 = buildStock(티커, json.data);
        if (종목) {
          종목목록설정(p => [...p, 종목].sort((a, b) => b.매집점수 - a.매집점수));
          선택종목설정(종목);
          탭설정("시세");
          AI분석설정(""); AI오류설정("");
          로그설정(p => [...p, { 시간: new Date().toTimeString().slice(0,8), 내용: `${티커}: $${json.data.c} ✅`, 성공: true }]);
        }
      } else {
        로그설정(p => [...p, { 시간: new Date().toTimeString().slice(0,8), 내용: `${티커}: ❌ ${json.error || "없음"}`, 성공: false }]);
        로그표시설정(true);
      }
    } catch (e) {
      로그설정(p => [...p, { 시간: new Date().toTimeString().slice(0,8), 내용: `${티커}: ❌ ${e.message}`, 성공: false }]);
    }
    현재티커설정("");
  }

  // ── AI 분석 ──────────────────────────────────────────────────
  async function AI실행(종목) {
    if (!종목) return;
    AI로딩설정(true); AI분석설정(""); AI오류설정("");
    try {
      const 응답 = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock: 종목 }),
      });
      if (!응답.ok) {
        const d = await 응답.json();
        AI오류설정(d.error || `서버 오류 ${응답.status}`);
        return;
      }
      const d = await 응답.json();
      AI분석설정(d.text || "분석 결과 없음");
    } catch (e) { AI오류설정("연결 오류: " + e.message); }
    finally    { AI로딩설정(false); }
  }

  function 종목선택(종목) { 선택종목설정(종목); 탭설정("시세"); AI분석설정(""); AI오류설정(""); }

  const 탭목록 = ["시세", "볼린저밴드", "매집분석", "매매가격", "AI분석"];
  const 진행률 = 전체수 > 0 ? Math.round(완료수 / 전체수 * 100) : 0;
  const 실패수  = 로그.filter(l => !l.성공).length;

  return (
    <div style={{ background:"#f5f5f5", color:"#111111", minHeight:"100vh", display:"flex", flexDirection:"column", fontFamily:"'Noto Sans KR',sans-serif", fontSize:13 }}>

      {/* ── 헤더 ── */}
      <header style={{ background:"#ffffff", borderBottom:"2px solid #dddddd", padding:"12px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10, boxShadow:"0 2px 6px rgba(0,0,0,0.08)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ background:"#003399", borderRadius:8, padding:"5px 14px", fontFamily:"'JetBrains Mono',monospace", fontWeight:700, fontSize:14, color:"#ffffff", letterSpacing:1 }}>
            나스닥
          </div>
          <div>
            <div style={{ fontSize:17, fontWeight:700, color:"#111111" }}>실시간 급등주 스크리너</div>
            <div style={{ fontSize:11, color:"#888888" }}>이중 볼린저밴드 · 세력 매집 · AI 분석 · 완전 무료</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          {업데이트 && (
            <span style={{ fontSize:11, color:"#007700", fontFamily:"monospace", background:"#eeffee", border:"1px solid #bbddbb", borderRadius:4, padding:"2px 8px" }}>
              ✅ {업데이트} 업데이트
            </span>
          )}
          <button
            onClick={() => 로그표시설정(v => !v)}
            style={{ background:"#fffbe6", border:"1px solid #ddbb00", borderRadius:7, padding:"5px 12px", color:"#886600", fontSize:11, fontWeight:700 }}
          >
            🔍 진단 {로그.length > 0 && `(${실패수}실패)`}
          </button>
          <button
            onClick={() => 스캔()} disabled={스캔중}
            style={{ background: 스캔중 ? "#eeeeee" : "#003399", border:"none", borderRadius:8, padding:"7px 20px", color: 스캔중 ? "#888888" : "#ffffff", fontSize:13, fontWeight:700, boxShadow: 스캔중 ? "none" : "0 2px 8px rgba(0,51,153,0.3)" }}
          >
            {스캔중 ? `스캔 중 ${진행률}%` : "🔍 전체 스캔"}
          </button>
        </div>
      </header>

      {/* ── 진행 바 ── */}
      {스캔중 && (
        <div style={{ background:"#ffffff", borderBottom:"1px solid #eeeeee" }}>
          <div style={{ height:4, background:"#eeeeee" }}>
            <div style={{ height:"100%", width:`${진행률}%`, background:"#003399", transition:"width .3s ease" }}/>
          </div>
          <div style={{ padding:"5px 20px", display:"flex", alignItems:"center", gap:14, fontSize:11, color:"#888888" }}>
            <span>{완료수}/{전체수} 완료</span>
            {현재티커 && <span style={{ color:"#003399", fontWeight:700, fontFamily:"monospace" }}>→ {현재티커} 로딩 중...</span>}
            <span>로드된 종목은 왼쪽 목록에 즉시 표시됩니다</span>
          </div>
        </div>
      )}

      {/* ── 진단 로그 ── */}
      {로그표시 && 로그.length > 0 && (
        <div style={{ background:"#fffbe6", borderBottom:"1px solid #ddbb00", padding:"10px 20px", maxHeight:200, overflowY:"auto" }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#886600", marginBottom:8 }}>
            🔍 진단 결과: {로그.filter(l => l.성공).length}성공 / {실패수}실패
          </div>
          {로그.map((l, i) => (
            <div key={i} style={{ fontSize:11, fontFamily:"monospace", color: l.성공 ? "#007700" : "#cc0000", marginBottom:2 }}>
              [{l.시간}] {l.내용}
            </div>
          ))}
          {실패수 > 0 && (
            <div style={{ marginTop:10, padding:"8px 12px", background:"#fff0f0", border:"1px solid #ffbbbb", borderRadius:7, fontSize:12, color:"#cc0000" }}>
              💡 실패 원인 대부분: Vercel 환경변수 FINNHUB_API_KEY 미설정 또는 Redeploy 미완료
            </div>
          )}
        </div>
      )}

      {/* ── 바디 ── */}
      <div style={{ display:"flex", flex:1, overflow:"hidden", height:"calc(100vh - 60px)" }}>

        {/* ── 왼쪽 목록 ── */}
        <div style={{ width:310, display:"flex", flexDirection:"column", borderRight:"2px solid #dddddd", flexShrink:0, background:"#ffffff" }}>

          {/* 종목 추가 */}
          <div style={{ padding:"10px", borderBottom:"1px solid #eeeeee", display:"flex", gap:7 }}>
            <input
              value={입력값}
              onChange={e => 입력값설정(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && 종목추가()}
              placeholder="티커 입력 후 Enter (예: AAPL)"
              style={{ flex:1, background:"#f8f8f8", border:"1px solid #cccccc", borderRadius:7, padding:"7px 11px", color:"#111111", fontSize:12, fontFamily:"'JetBrains Mono',monospace", outline:"none" }}
            />
            <button
              onClick={종목추가}
              style={{ background:"#003399", border:"none", borderRadius:7, padding:"7px 14px", color:"#ffffff", fontSize:12, fontWeight:700 }}
            >추가</button>
          </div>

          {/* 컬럼 헤더 */}
          <div style={{ display:"grid", gridTemplateColumns:"60px 1fr 46px 56px", padding:"6px 10px", background:"#f0f0f0", borderBottom:"1px solid #dddddd", fontSize:10, color:"#888888", fontWeight:700 }}>
            <span>티커</span>
            <span>BB 구간</span>
            <span style={{ textAlign:"right" }}>변동</span>
            <span style={{ textAlign:"right" }}>매집점수</span>
          </div>

          {/* 종목 목록 */}
          <div style={{ flex:1, overflowY:"auto" }}>

            {/* 로딩 중 표시 */}
            {스캔중 && 종목목록.length === 0 && (
              <div style={{ padding:28, textAlign:"center" }}>
                <div style={{ fontSize:14, color:"#003399", marginBottom:8, fontWeight:700 }}>📡 데이터 수신 중</div>
                <div style={{ fontSize:11, color:"#888888", marginBottom:14 }}>
                  {현재티커 ? `${현재티커} 로딩 중...` : "시작 중..."}
                </div>
                <div style={{ height:4, background:"#eeeeee", borderRadius:4, overflow:"hidden", position:"relative" }}>
                  <div style={{ position:"absolute", height:"100%", width:"40%", background:"#003399", animation:"로딩 1.2s linear infinite" }}/>
                </div>
              </div>
            )}

            {/* 종목 행 */}
            {종목목록.map((종목, i) => (
              <div
                key={종목.ticker}
                className="종목행"
                onClick={() => 종목선택(종목)}
                style={{
                  display:"grid", gridTemplateColumns:"60px 1fr 46px 56px",
                  padding:"9px 10px", alignItems:"center",
                  background: 선택종목?.ticker === 종목.ticker ? "#e8f0ff" : i % 2 === 0 ? "#ffffff" : "#fafafa",
                  borderLeft: `3px solid ${선택종목?.ticker === 종목.ticker ? "#003399" : "transparent"}`,
                  borderBottom:"1px solid #eeeeee",
                }}
              >
                <div>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700, fontSize:13, color:"#111111" }}>{종목.ticker}</div>
                  <div style={{ fontSize:10, color:"#888888", marginTop:1 }}>${종목.현재가}</div>
                </div>
                <div style={{ fontSize:10, color: 종목.bb구간?.색 || "#888888", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", paddingRight:4 }}>
                  {종목.bb구간?.명칭 || "-"}
                </div>
                <div style={{ textAlign:"right", fontFamily:"'JetBrains Mono',monospace", fontWeight:700, fontSize:12,
                  color: Math.abs(종목.변동률) <= 3 ? "#007700" : 종목.변동률 >= 0 ? "#886600" : "#cc0000" }}>
                  {종목.변동률 >= 0 ? "+" : ""}{종목.변동률}%
                </div>
                <div style={{ textAlign:"right" }}>
                  <span style={{
                    background: 매집색(종목.매집점수) + "15",
                    color: 매집색(종목.매집점수),
                    border: `1px solid ${매집색(종목.매집점수)}44`,
                    borderRadius:5, padding:"2px 8px",
                    fontSize:12, fontWeight:700, fontFamily:"'JetBrains Mono',monospace",
                  }}>{종목.매집점수}</span>
                </div>
              </div>
            ))}

            {/* 빈 상태 */}
            {!스캔중 && 종목목록.length === 0 && (
              <div style={{ padding:24, textAlign:"center" }}>
                <div style={{ fontSize:14, color:"#cc0000", marginBottom:10 }}>❌ 데이터 없음</div>
                <div style={{ fontSize:12, color:"#886600", marginBottom:12, lineHeight:1.8 }}>
                  🔍 진단 버튼으로 원인 확인<br/>
                  <span style={{ fontSize:11, color:"#888888" }}>가장 흔한 원인: FINNHUB_API_KEY 미설정</span>
                </div>
                <button
                  onClick={() => 스캔()}
                  style={{ background:"#003399", border:"none", borderRadius:8, padding:"8px 20px", color:"#ffffff", fontSize:12, fontWeight:700 }}
                >🔄 다시 시도</button>
              </div>
            )}
          </div>

          {/* 하단 상태 */}
          <div style={{ padding:"7px 12px", background:"#f0f0f0", borderTop:"1px solid #dddddd", fontSize:11, color:"#888888", textAlign:"center" }}>
            {스캔중
              ? `${종목목록.length}개 로드됨 · ${전체수 - 완료수}개 남음`
              : 종목목록.length > 0
                ? `✅ ${종목목록.length}종목 · 매집점수 내림차순`
                : "스캔 대기 중"}
          </div>
        </div>

        {/* ── 오른쪽 상세 ── */}
        <div style={{ flex:1, overflowY:"auto", padding:20, background:"#f5f5f5" }}>

          {/* 대기 화면 */}
          {!선택종목 && (
            <div style={{ height:"65%", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:14 }}>
              {스캔중 ? (
                <>
                  <div style={{ fontSize:32 }}>📡</div>
                  <div style={{ fontSize:16, color:"#003399", fontWeight:700 }}>실시간 데이터 수신 중</div>
                  <div style={{ fontSize:12, color:"#888888", textAlign:"center", lineHeight:1.9 }}>
                    종목이 로드되면 왼쪽 목록에 즉시 표시됩니다<br/>
                    완료 전에도 클릭해서 분석할 수 있습니다
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize:32 }}>📊</div>
                  <div style={{ fontSize:15, color:"#888888" }}>왼쪽 목록에서 종목을 클릭하세요</div>
                </>
              )}
            </div>
          )}

          {/* 선택 종목 상세 */}
          {선택종목 && (
            <div className="나타남">

              {/* 종목 헤더 */}
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14, flexWrap:"wrap" }}>
                <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:26, fontWeight:700, color:"#111111" }}>
                  {선택종목.ticker}
                </span>
                {선택종목.bb구간 && <태그 색={선택종목.bb구간.색} 내용={선택종목.bb구간.명칭}/>}
                <태그 색={선택종목.매집등급.색} 내용={선택종목.매집등급.명칭}/>
                {선택종목.bb?.밴드폭 <= 6       && <태그 색="#cc0000" 내용="밴드수축 🚨"/>}
                {선택종목.변동률 >= 10           && <태그 색="#cc0000" 내용={`+${선택종목.변동률}% 급등`}/>}
                {Math.abs(선택종목.변동률) <= 3  && <태그 색="#007700" 내용="횡보 중"/>}
              </div>

              {/* 탭 버튼 */}
              <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap" }}>
                {탭목록.map(t => (
                  <button
                    key={t}
                    onClick={() => 탭설정(t)}
                    style={{
                      padding:"6px 16px",
                      background: 탭 === t ? "#003399" : "#ffffff",
                      border: `1px solid ${탭 === t ? "#003399" : "#cccccc"}`,
                      borderRadius:7,
                      color: 탭 === t ? "#ffffff" : "#555555",
                      fontSize:12, fontWeight:700, whiteSpace:"nowrap",
                    }}
                  >
                    {t === "시세"     ? "📈 시세"
                    : t === "볼린저밴드"? "📊 볼린저밴드"
                    : t === "매집분석" ? "🎯 매집분석"
                    : t === "매매가격" ? "💰 매매가격"
                    :                   "🤖 AI분석"}
                  </button>
                ))}
              </div>

              {/* ── 시세 탭 ── */}
              {탭 === "시세" && (
                <>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:14 }}>
                    <정보칸 제목="현재가"  값={`$${선택종목.현재가}`} 색="#111111"/>
                    <정보칸
                      제목="변동률"
                      값={`${선택종목.변동률 >= 0 ? "+" : ""}${선택종목.변동률}%`}
                      색={Math.abs(선택종목.변동률) <= 3 ? "#007700" : 선택종목.변동률 >= 0 ? "#886600" : "#cc0000"}
                      설명={Math.abs(선택종목.변동률) <= 3 ? "횡보 → 매집 적합" : ""}
                    />
                    <정보칸 제목="고가"    값={`$${선택종목.고가}`} 색="#cc3300"/>
                    <정보칸 제목="저가"    값={`$${선택종목.저가}`} 색="#005599"/>
                    <정보칸
                      제목="VWAP"
                      값={`$${선택종목.vwap}`}
                      색={선택종목.현재가 > 선택종목.vwap ? "#007700" : "#cc0000"}
                      설명={선택종목.현재가 > 선택종목.vwap ? "현재가 위 ✅" : "현재가 아래 ❌"}
                    />
                    <정보칸 제목="ATR(변동성)" 값={`$${선택종목.atr}`} 색="#555555" 설명={`일중 변동성 ${선택종목.atr비율}%`}/>
                    <정보칸 제목="BB 구간"  값={선택종목.bb구간?.명칭 || "-"} 색={선택종목.bb구간?.색 || "#888888"}/>
                    <정보칸 제목="BB 신호"  값={선택종목.bb구간?.신호 || "-"} 색={선택종목.bb구간?.색 || "#888888"}/>
                  </div>
                  <BBChart 종목={선택종목}/>
                </>
              )}

              {/* ── 볼린저밴드 탭 ── */}
              {탭 === "볼린저밴드" && (
                <>
                  <BBChart 종목={선택종목}/>
                  <div style={{ background:"#ffffff", border:"1px solid #dddddd", borderRadius:10, padding:16 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:"#333333", marginBottom:14 }}>
                      이중 볼린저밴드 수치 상세
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
                      <정보칸 제목="BB1 상단 (2표준편차)" 값={`$${선택종목.bb.bb1상단}`} 색="#cc0000" 설명="강한 저항선"/>
                      <정보칸 제목="BB2 상단 (1표준편차)" 값={`$${선택종목.bb.bb2상단}`} 색="#007700" 설명="★ 매수 구간 상단"/>
                      <정보칸 제목="이동평균선 (20일)"    값={`$${선택종목.bb.이평선}`}   색="#886600" 설명="기준선"/>
                      <정보칸 제목="BB2 하단 (1표준편차)" 값={`$${선택종목.bb.bb2하단}`} 색="#cc5500" 설명="매도 구간 상단"/>
                      <정보칸 제목="BB1 하단 (2표준편차)" 값={`$${선택종목.bb.bb1하단}`} 색="#cc0000" 설명="강한 지지선"/>
                      <정보칸
                        제목="밴드폭"
                        값={`${선택종목.bb.밴드폭}%`}
                        색={선택종목.bb.밴드폭 <= 6 ? "#cc0000" : 선택종목.bb.밴드폭 <= 10 ? "#886600" : "#005599"}
                        설명={선택종목.bb.밴드폭 <= 6 ? "수축! 매집 직전 🚨" : 선택종목.bb.밴드폭 <= 10 ? "좁아짐" : "정상"}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* ── 매집분석 탭 ── */}
              {탭 === "매집분석" && (
                <div style={{ background:"#ffffff", border:"1px solid #dddddd", borderRadius:10, padding:16 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                    <span style={{ fontSize:15, fontWeight:700, color:"#333333" }}>🎯 세력 매집 분석</span>
                    <span style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700, fontSize:20, color: 매집색(선택종목.매집점수) }}>
                      {선택종목.매집점수}
                      <span style={{ fontSize:13, color:"#888888" }}>점 / 100점</span>
                    </span>
                  </div>

                  {선택종목.매집신호.length === 0 ? (
                    <div style={{ fontSize:13, color:"#888888", padding:"10px 0" }}>
                      유의미한 매집 신호 없음 — 관망 구간
                    </div>
                  ) : (
                    선택종목.매집신호.map((신호, i) => (
                      <div key={i} style={{ padding:"9px 14px", marginBottom:8, background:"#f0fff0", border:"1px solid #bbddbb", borderLeft:"3px solid #007700", borderRadius:8, fontSize:13, color:"#005500" }}>
                        {신호}
                      </div>
                    ))
                  )}

                  {/* 점수 바 */}
                  <div style={{ marginTop:16 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#888888", marginBottom:6 }}>
                      <span>매집 강도</span>
                      <span style={{ color: 매집색(선택종목.매집점수), fontWeight:700 }}>{선택종목.매집등급.명칭}</span>
                    </div>
                    <div style={{ background:"#eeeeee", borderRadius:4, height:12 }}>
                      <div style={{
                        width:`${선택종목.매집점수}%`, height:"100%", borderRadius:4,
                        background: 매집색(선택종목.매집점수),
                        transition:"width 1s ease",
                      }}/>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"#aaaaaa", marginTop:4 }}>
                      <span>0 미약</span><span>20 관심</span><span>40 가능</span><span>60점+ 강력</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── 매매가격 탭 ── */}
              {탭 === "매매가격" && (
                <div style={{ background:"#ffffff", border:"1px solid #dddddd", borderRadius:10, padding:16 }}>
                  <div style={{ fontSize:15, fontWeight:700, color:"#333333", marginBottom:16 }}>
                    💰 실시간 가격 기반 신중한 매매 추천
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:14 }}>
                    <가격카드 제목="🟢 진입가"   값={`$${선택종목.진입가}`} 색="#005599" 설명="VWAP + 0.5%"/>
                    <가격카드 제목="🔴 손절가"   값={`$${선택종목.손절가}`} 색="#cc0000" 설명={`리스크 $${선택종목.리스크}/주`}/>
                    <가격카드 제목="🎯 1차 목표" 값={`$${선택종목.목표1}`}  색="#007700" 설명="손익비 1:2.5"/>
                    <가격카드 제목="🎯 2차 목표" 값={`$${선택종목.목표2}`}  색="#886600" 설명="손익비 1:4"/>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:14 }}>
                    <정보칸 제목="리스크/주"  값={`$${선택종목.리스크}`} 색="#cc0000"/>
                    <정보칸 제목="1차 수익/주" 값={`$${(선택종목.목표1 - 선택종목.진입가).toFixed(2)}`} 색="#007700"/>
                    <정보칸 제목="손익비"     값="1 : 2.5" 색="#886600"/>
                  </div>
                  <div style={{ padding:"12px 16px", background:"#f8f9ff", border:"1px solid #ccccff", borderRadius:9, fontSize:12, color:"#333333", lineHeight:2 }}>
                    <strong style={{ color:"#003399" }}>✅ 진입 전 체크리스트</strong><br/>
                    ☐ BB2 상단 ~ BB1 상단 구간 (★ 매수 구간) 확인<br/>
                    ☐ VWAP 위 가격 유지 확인<br/>
                    ☐ 변동률 ±3% 이내 횡보 패턴 확인<br/>
                    ☐ 손절가 사전 설정 완료 후 진입
                  </div>
                </div>
              )}

              {/* ── AI분석 탭 ── */}
              {탭 === "AI분석" && (
                <div style={{ background:"#ffffff", border:"1px solid #dddddd", borderRadius:10, padding:18 }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <span style={{ fontSize:18 }}>🤖</span>
                      <span style={{ fontSize:15, fontWeight:700, color:"#333333" }}>AI 종합 분석</span>
                      <태그 색="#005599" 내용={선택종목.ticker}/>
                      <span style={{ fontSize:10, color:"#007700", background:"#eeffee", border:"1px solid #bbddbb", borderRadius:4, padding:"1px 8px", fontWeight:700 }}>Groq 무료</span>
                    </div>
                    <button
                      onClick={() => AI실행(선택종목)} disabled={AI로딩}
                      style={{ padding:"6px 16px", background: AI로딩 ? "#eeeeee" : "#003399", border:"none", borderRadius:7, color: AI로딩 ? "#888888" : "#ffffff", fontSize:12, fontWeight:700 }}
                    >
                      {AI로딩 ? "분석 중..." : "🔄 AI 분석 실행"}
                    </button>
                  </div>

                  {AI로딩 && (
                    <div style={{ padding:"20px 0", textAlign:"center" }}>
                      <div style={{ fontSize:13, color:"#003399", marginBottom:10 }}>
                        이중 볼린저밴드 · 세력 매집 · 진입 전략 분석 중...
                      </div>
                      <div style={{ height:4, background:"#eeeeee", borderRadius:4, overflow:"hidden", position:"relative" }}>
                        <div style={{ position:"absolute", height:"100%", width:"40%", background:"#003399", animation:"로딩 1.2s linear infinite" }}/>
                      </div>
                    </div>
                  )}

                  {AI오류 && !AI로딩 && (
                    <div style={{ background:"#fff0f0", border:"1px solid #ffbbbb", borderRadius:8, padding:14, fontSize:12, color:"#cc0000" }}>
                      ❌ {AI오류}
                    </div>
                  )}

                  {AI분석 && !AI로딩 && (
                    <div style={{ fontSize:13, color:"#222222", lineHeight:2.1, whiteSpace:"pre-wrap" }}>
                      {AI분석}
                    </div>
                  )}

                  {!AI분석 && !AI로딩 && !AI오류 && (
                    <div style={{ textAlign:"center", padding:"24px 0", fontSize:13, color:"#888888" }}>
                      위 <strong style={{ color:"#003399" }}>🔄 AI 분석 실행</strong> 버튼을 클릭하세요
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
