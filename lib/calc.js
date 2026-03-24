function mean(arr) {
  if (!arr || !arr.length) return 0;
  return arr.reduce((sum, x) => sum + x, 0) / arr.length;
}

function std(arr) {
  if (!arr || !arr.length) return 0;
  const m = mean(arr);
  const variance = mean(arr.map((x) => (x - m) ** 2));
  return Math.sqrt(variance);
}

function rsi(values, period = 14) {
  if (!values || values.length < period + 1) return 50;
  let gain = 0;
  let loss = 0;
  for (let i = values.length - period; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gain += diff;
    else loss += Math.abs(diff);
  }
  if (loss === 0) return 100;
  const rs = gain / loss;
  return 100 - 100 / (1 + rs);
}

export function buildStock(symbol, payload) {
  const quote = payload.quote || {};
  const candles = payload.candles || { c: [], v: [] };
  const news = Array.isArray(payload.news) ? payload.news : [];

  const price = Number(quote.c || 0);
  const prevClose = Number(quote.pc || price || 0);
  const high = Number(quote.h || price || 0);
  const low = Number(quote.l || price || 0);

  const closes = Array.isArray(candles.c) && candles.c.length
    ? candles.c.map(Number)
    : Array.from({ length: 60 }, (_, i) => Number((price * (0.9 + i * 0.002)).toFixed(2)));

  const volumes = Array.isArray(candles.v) && candles.v.length
    ? candles.v.map(Number)
    : Array.from({ length: 60 }, (_, i) => 100000 + i * 5000);

  const changePct = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;
  const ma20 = mean(closes.slice(-20));
  const ma50 = mean(closes.slice(-50));
  const sd20 = std(closes.slice(-20));
  const upper1 = ma20 + sd20;
  const lower1 = ma20 - sd20;
  const upper2 = ma20 + sd20 * 2;
  const lower2 = ma20 - sd20 * 2;
  const bandWidth = ma20 ? ((upper2 - lower2) / ma20) * 100 : 0;

  const todayVolume = volumes[volumes.length - 1] || 0;
  const avgVol20 = mean(volumes.slice(-20));
  const rvol = avgVol20 ? todayVolume / avgVol20 : 1;
  const rsi14 = rsi(closes);

  let score = 0;
  if (changePct > 0) score += Math.min(20, changePct * 2);
  if (rvol > 1) score += Math.min(20, (rvol - 1) * 10);
  if (price > ma20) score += 10;
  if (ma20 > ma50) score += 10;
  if (price > upper1) score += 12;
  if (price > upper2) score += 8;
  if (bandWidth > 8) score += 8;
  if (news.length) score += 10;
  if (rsi14 >= 50 && rsi14 <= 75) score += 8;
  score = Math.max(0, Math.min(100, Math.round(score)));

  const tags = [];
  if (news.length) tags.push("뉴스");
  if (rvol >= 2) tags.push("거래량");
  if (price > upper2) tags.push("강돌파");
  else if (price > upper1) tags.push("돌파");
  if (bandWidth < 6) tags.push("수축");
  if (price >= ma20 && price <= ma20 * 1.02) tags.push("눌림");
  if (rsi14 > 75) tags.push("과열");

  const entry = Number((Math.max(price, ma20)).toFixed(2));
  const stop = Number((Math.max(lower1, entry * 0.95)).toFixed(2));
  const target1 = Number((entry + (entry - stop) * 1.5).toFixed(2));
  const target2 = Number((entry + (entry - stop) * 2.5).toFixed(2));
  const rr = entry > stop ? Number((((target1 - entry) / (entry - stop))).toFixed(2)) : 0;

  return {
    ticker: symbol,
    price,
    prevClose,
    high,
    low,
    changePct: Number(changePct.toFixed(2)),
    ma20: Number(ma20.toFixed(2)),
    ma50: Number(ma50.toFixed(2)),
    upper1: Number(upper1.toFixed(2)),
    lower1: Number(lower1.toFixed(2)),
    upper2: Number(upper2.toFixed(2)),
    lower2: Number(lower2.toFixed(2)),
    bandWidth: Number(bandWidth.toFixed(2)),
    rvol: Number(rvol.toFixed(2)),
    rsi14: Number(rsi14.toFixed(1)),
    score,
    tags,
    entry,
    stop,
    target1,
    target2,
    rr,
    news: news.slice(0, 5),
    candles: closes.map((close, i) => ({ x: i + 1, close }))
  };
}
