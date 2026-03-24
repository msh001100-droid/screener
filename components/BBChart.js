// components/BBChart.js - 이중 볼린저밴드 시각화

export default function BBChart({ 종목 }) {
  const { 현재가, bb } = 종목;
  if (!bb) return null;

  const 범위 = bb.bb1상단 - bb.bb1하단;
  if (범위 <= 0) return null;

  const 위치 = v =>
    `${Math.max(1, Math.min(99, ((v - bb.bb1하단) / 범위) * 100)).toFixed(1)}%`;

  const 구간목록 = [
    { 명칭:"BB1 상단 돌파",  설명:"가격 > BB1 상단",     색:"#cc0000", 참고:"과매수 주의" },
    { 명칭:"★ 매수 구간",   설명:"BB2상단 ~ BB1상단",  색:"#007700", 참고:"진입 적합!" },
    { 명칭:"중립 (이평 위)", 설명:"이평선 ~ BB2상단",   색:"#886600", 참고:"관망" },
    { 명칭:"중립 (이평 아래)",설명:"BB2하단 ~ 이평선",  색:"#995500", 참고:"조정" },
    { 명칭:"BB 매도 구간",  설명:"BB1하단 ~ BB2하단",   색:"#cc3300", 참고:"반등 대기" },
    {
      명칭: `밴드폭 ${bb.밴드폭}%`,
      설명: bb.밴드폭 <= 6 ? "수축! 매집 직전" : bb.밴드폭 <= 10 ? "좁아짐" : "정상",
      색:   bb.밴드폭 <= 6 ? "#cc0000" : "#005599",
      참고: bb.밴드폭 <= 6 ? "🚨 주목" : "",
    },
  ];

  return (
    <div style={{ background:"#ffffff", border:"1px solid #dddddd", borderRadius:10, padding:16, marginBottom:14 }}>
      <div style={{ fontSize:14, fontWeight:700, color:"#333333", marginBottom:14 }}>
        📊 이중 볼린저밴드 시각화 — BB1(2표준편차) · BB2(1표준편차)
      </div>

      {/* 바 시각화 */}
      <div style={{ position:"relative", height:52, marginBottom:14 }}>
        {/* BB1 전체 범위 배경 */}
        <div style={{ position:"absolute", left:0, right:0, top:13, height:26,
          background:"#ffeeee", border:"1px solid #ffbbbb", borderRadius:5 }}/>
        {/* BB2 상단 매수구간 강조 */}
        <div style={{ position:"absolute", left:위치(bb.bb2상단), right:"1%", top:13, height:26,
          background:"#eeffee", borderLeft:"2px solid #00aa00" }}/>
        {/* 이동평균선 */}
        <div style={{ position:"absolute", left:위치(bb.이평선), top:8, width:2, height:36,
          background:"#886600", borderRadius:2 }}/>
        {/* BB2 상단 선 */}
        <div style={{ position:"absolute", left:위치(bb.bb2상단), top:8, width:1, height:36, background:"#00aa00" }}/>
        {/* BB2 하단 선 */}
        <div style={{ position:"absolute", left:위치(bb.bb2하단), top:8, width:1, height:36, background:"#cc5500" }}/>
        {/* 현재가 표시 */}
        <div style={{ position:"absolute", left:위치(현재가), top:5, transform:"translateX(-50%)" }}>
          <div style={{ width:14, height:14, borderRadius:"50%", background:"#0055cc",
            border:"2px solid #003399", marginTop:11 }}/>
        </div>
      </div>

      {/* 가격 레이블 */}
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
        {[
          { 명칭:"BB1 하단", 값:`$${bb.bb1하단}`, 색:"#cc0000" },
          { 명칭:"BB2 하단", 값:`$${bb.bb2하단}`, 색:"#cc5500" },
          { 명칭:"이평선",   값:`$${bb.이평선}`,  색:"#886600" },
          { 명칭:"BB2 상단", 값:`$${bb.bb2상단}`, 색:"#007700" },
          { 명칭:"BB1 상단", 값:`$${bb.bb1상단}`, 색:"#cc0000" },
        ].map((x, i) => (
          <div key={i} style={{ textAlign:"center" }}>
            <div style={{ fontSize:9, color:x.색, fontWeight:700 }}>{x.명칭}</div>
            <div style={{ fontSize:10, color:x.색, fontFamily:"'JetBrains Mono',monospace", fontWeight:700 }}>{x.값}</div>
          </div>
        ))}
      </div>

      {/* 구간 설명 */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6, marginBottom:14 }}>
        {구간목록.map((g, i) => (
          <div key={i} style={{ background:"#f8f8f8", border:`1px solid #dddddd`,
            borderLeft:`3px solid ${g.색}`, borderRadius:6, padding:"6px 8px" }}>
            <div style={{ fontSize:9, color:g.색, fontWeight:700 }}>{g.명칭}</div>
            <div style={{ fontSize:8, color:"#666666", marginTop:2 }}>{g.설명}</div>
            {g.참고 && <div style={{ fontSize:8, color:g.색, fontWeight:700 }}>{g.참고}</div>}
          </div>
        ))}
      </div>

      {/* 전략 요약 */}
      <div style={{ padding:"10px 14px", background:"#f8f9ff", border:"1px solid #ddddff",
        borderRadius:8, fontSize:12, color:"#333333", lineHeight:1.9 }}>
        <strong style={{ color:"#003399" }}>이중 볼린저밴드 핵심 전략:</strong><br/>
        ① <strong style={{ color:"#007700" }}>BB2 상단 ~ BB1 상단 = ★ 최적 매수 구간</strong><br/>
        ② 밴드폭 6% 미만 수축 = 큰 변동 직전 신호 (매집 완료)<br/>
        ③ BB1 상단 돌파 후 유지 = 강한 상승 추세 지속<br/>
        ④ BB2 하단 이탈 = 매도 신호, BB1 하단이 최종 지지선
      </div>
    </div>
  );
}
