// lib/calc.js

// ── 이중 볼린저밴드 (BB1=2σ 외부, BB2=1σ 내부) ──────────────
export function calcBB(p, h, l, pc, o) {
  const pts = [p, h, l, pc, o].filter(v => v > 0);
  const n   = pts.length || 1;
  const sma = pts.reduce((a, b) => a + b, 0) / n;
  const sd  = Math.max(
    Math.sqrt(pts.reduce((s, v) => s + (v - sma) ** 2, 0) / n),
    p * 0.01
  );
  return {
    sma:  +sma.toFixed(3),
    b1u:  +(sma + 2 * sd).toFixed(3),   // BB1 상단
    b1l:  +(sma - 2 * sd).toFixed(3),   // BB1 하단
    b2u:  +(sma + 1 * sd).toFixed(3),   // BB2 상단
    b2l:  +(sma - 1 * sd).toFixed(3),   // BB2 하단
    bw:   +((4 * sd / sma) * 100).toFixed(1), // 밴드폭
  };
}

// ── BB 구간 판정 ─────────────────────────────────────────────
export function bbZone(p, bb) {
  if (!bb) return null;
  if (p >= bb.b1u) return { l:"BB1 상단 돌파",    c:"#ff4d4d", s:"과매수 — 추격 주의",  id:1 };
  if (p >= bb.b2u) return { l:"★ BB 매수 구간",  c:"#00ff88", s:"강세 — 진입 적합",    id:2 };
  if (p >= bb.sma) return { l:"SMA 위 (중립)",   c:"#ffd700", s:"관망",               id:3 };
  if (p >= bb.b2l) return { l:"SMA 아래 (중립)", c:"#ff9944", s:"조정",               id:4 };
  if (p >= bb.b1l) return { l:"BB 매도 구간",    c:"#ff6633", s:"반등 대기",           id:5 };
  return                  { l:"BB1 하단 돌파",   c:"#aa44ff", s:"극도 과매도",          id:6 };
}

// ── 매집 점수 ────────────────────────────────────────────────
export function accumScore(p, ch, vw, bb, zn) {
  let s = 0;
  const sig = [];

  if (zn?.id === 2)            { s += 30; sig.push("✅ BB 매수구간 (BB2~BB1 상단)"); }
  if (zn?.id === 1)            { s += 12; sig.push("⚡ BB1 상단 돌파 (강세)"); }
  if (bb?.bw <= 6)             { s += 20; sig.push("🎯 밴드수축 — 매집 직전!"); }
  else if (bb?.bw <= 10)       { s +=  8; sig.push("📊 밴드 좁아짐"); }
  if (Math.abs(ch) <= 3)       { s += 15; sig.push("🔵 횡보 (매집 패턴)"); }
  if (p > vw)                  { s += 15; sig.push("✅ VWAP 위"); }
  if (ch >= 10)                { s += 10; sig.push(`🔥 +${ch}% 급등`); }

  const sc = Math.min(s, 100);
  return {
    sc,
    sig,
    gr: sc >= 60 ? { t:"🔴 강력 매집", c:"#ff4d4d" }
      : sc >= 40 ? { t:"🟡 매집 가능", c:"#ffd700" }
      : sc >= 20 ? { t:"🔵 관심",      c:"#00d4ff" }
      :            { t:"⬜ 미약",       c:"#4a6080" },
  };
}

// ── 종목 데이터 조합 ─────────────────────────────────────────
export function buildStock(ticker, q) {
  const p  = +q.c.toFixed(2);
  const pc = q.pc || p;
  const h  = q.h  || p * 1.02;
  const l  = q.l  || p * 0.98;
  const o  = q.o  || pc;
  const ch = pc > 0 ? +((p - pc) / pc * 100).toFixed(2) : 0;
  const vw = +((h + l + p) / 3).toFixed(2);
  const at = +((h - l) * 1.2).toFixed(3);
  const atp = p > 0 ? +(at / p * 100).toFixed(1) : 0;

  const bb = calcBB(p, h, l, pc, o);
  const zn = bbZone(p, bb);
  const acc = accumScore(p, ch, vw, bb, zn);

  const en = +(vw * 1.005).toFixed(2);
  const ri = +(Math.max(at * 1.5, p * 0.025)).toFixed(2);

  return {
    ticker, p, pc, h, l, o, ch, vw, at, atp,
    bb, zn, sc: acc.sc, sig: acc.sig, gr: acc.gr,
    en, st: +(en - ri).toFixed(2),
    t1: +(en + ri * 2.5).toFixed(2),
    t2: +(en + ri * 4.0).toFixed(2),
    ri,
  };
}
