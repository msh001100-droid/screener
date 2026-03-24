function mean(arr) {
  if (!arr?.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr) {
  if (!arr?.length) return 0;
  const m = mean(arr);
  return Math.sqrt(mean(arr.map((v) => (v - m) ** 2)));
}

function ema(values, period) {
  if (!values?.length) return 0;
  const k = 2 / (period + 1);
  let result = values[0];
  for (let i = 1; i < values.length; i++) {
    result = values[i] * k + result * (1 - k);
  }
  return result;
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

function macd(values) {
  if (!values?.length) return { macd: 0, signal: 0, hist: 0 };
  const fast = ema(values, 12);
  const slow = ema(values, 26);
  const macdLine = fast - slow;
  const signal = macdLine * 0.8;
  return { macd: macdLine, signal, hist: macdLine - signal };
}

export function buildStock(ticker, payload = {}) {
  const quote = payload.quote || payload;
  const candles = payload.candles || {};
  const news = payload.news || [];
  const c = Number(quote.c || 0);
  const pc = Number(quote.pc || c || 0);
  const h = Number(quote.h || c || 0);
  const l = Number(quote.l || c || 0);
  const changePct = pc ? ((c - pc) / pc) * 100 : 0;

  const closes = Array.isArray(candles.c) && candles.c.length ? candles.c.map(Number) : Array.from({ length: 60 }, (_, i) => Math.max(0.2, c * (0.92 + i * 0.002)));
  const vols = Array.isArray(candles.v) && candles.v.length ? candles.v.map(Number) : Array.from({ length: 60 }, (_, i) => 100000 + i * 2000);

  const last20 = closes.slice(-20);
  const last50 = closes.slice(-50);
  const ma20 = mean(last20);
  const ma50 = mean(last50);
  const sd20 = stddev(last20);
  const upper1 = ma20 + sd20;
  const lower1 = ma20 - sd20;
  const upper2 = ma20 + sd20 * 2;
  const lower2 = ma20 - sd20 * 2;
  const bandWidth = ma20 ? ((upper2 - lower2) / ma20) * 100 : 0;
  const priceVsMa20 = ma20 ? ((c - ma20) / ma20) * 100 : 0;
  const todayVol = vols[vols.length - 1] || 0;
  const avgVol20 = mean(vols.slice(-20));
  const rvol = avgVol20 ? todayVol / avgVol20 : 1;
  const rsi14 = rsi(closes, 14);
  const m = macd(closes);
  const hasNews = news.length > 0;

  let score = 0;
  score += Math.max(0, Math.min(20, changePct * 1.8));
  score += Math.max(0, Math.min(18, (rvol - 1) * 8));
  score += c > ma20 ? 10 : 0;
  score += ma20 > ma50 ? 12 : 0;
  score += c > upper1 ? 10 : 0;
  score += c > upper2 ? 8 : 0;
  score += bandWidth > 12 ? 8 : bandWidth > 8 ? 5 : 1;
  score += hasNews ? 10 : 0;
  score += m.hist > 0 ? 8 : 0;
  score += rsi14 >= 50 && rsi14 <= 75 ? 8 : 0;
  score = Math.max(0, Math.min(100, Math.round(score)));

  const tags = [];
  if (hasNews) tags.push("뉴스");
  if (rvol >= 2) tags.push("거래량");
  if (c > upper2) tags.push("강돌파");
  else if (c > upper1) tags.push("돌파");
  if (bandWidth < 6) tags.push("수축");
  if (priceVsMa20 < 1 && priceVsMa20 > -2 && c >= ma20) tags.push("눌림");
  if (rsi14 > 75) tags.push("과열");

  const stop = Number((Math.max(lower1, c * 0.95)).toFixed(2));
  const entry = Number((c > upper1 ? c : Math.max(c, ma20)).toFixed(2));
  const target1 = Number((entry + (entry - stop) * 1.5).toFixed(2));
  const target2 = Number((entry + (entry - stop) * 2.5).toFixed(2));
  const rr = entry > stop ? Number(((target1 - entry) / (entry - stop)).toFixed(2)) : 0;

  return {
    ticker,
    price: c,
    prevClose: pc,
    high: h,
    low: l,
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
    macdHist: Number(m.hist.toFixed(3)),
    score,
    tags,
    hasNews,
    entry,
    stop,
    target1,
    target2,
    rr,
    candles: closes.map((v, i) => ({ x: i + 1, close: v })),
    news: news.slice(0, 5).map((n) => ({
      headline: n.headline || n.title || "뉴스",
      source: n.source || n.site || "source",
      url: n.url || "#"
    }))
  };
}

export function filterStocks(stocks, opts = {}) {
  const {
    minScore = 0,
    priceMin = 0,
    priceMax = 9999,
    newsOnly = false,
    breakoutOnly = false,
    pullbackOnly = false
  } = opts;

  return stocks.filter((s) => {
    if (!s) return false;
    if (s.score < minScore) return false;
    if (s.price < priceMin || s.price > priceMax) return false;
    if (newsOnly && !s.hasNews) return false;
    if (breakoutOnly && !(s.price > s.upper1)) return false;
    if (pullbackOnly && !s.tags.includes("눌림")) return false;
    return true;
  });
}
