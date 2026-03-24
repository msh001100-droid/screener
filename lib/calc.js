function round(value, digits = 2) {
  if (value == null || Number.isNaN(value)) return null;
  return Number(value.toFixed(digits));
}

function sma(values, period) {
  if (!values.length || values.length < period) return null;
  const slice = values.slice(values.length - period);
  return slice.reduce((sum, value) => sum + value, 0) / period;
}

function std(values, period) {
  if (!values.length || values.length < period) return null;
  const slice = values.slice(values.length - period);
  const mean = slice.reduce((sum, value) => sum + value, 0) / period;
  const variance = slice.reduce((sum, value) => sum + (value - mean) ** 2, 0) / period;
  return Math.sqrt(variance);
}

function emaSeries(values, period) {
  if (!values.length) return [];
  const multiplier = 2 / (period + 1);
  const result = [values[0]];
  for (let i = 1; i < values.length; i += 1) {
    result.push(values[i] * multiplier + result[i - 1] * (1 - multiplier));
  }
  return result;
}

function rsi(values, period = 14) {
  if (values.length <= period) return null;
  let gains = 0;
  let losses = 0;
  for (let i = values.length - period + 1; i < values.length; i += 1) {
    const change = values[i] - values[i - 1];
    if (change >= 0) gains += change;
    else losses += Math.abs(change);
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

function macd(values) {
  if (values.length < 35) return { macd: null, signal: null, hist: null };
  const ema12 = emaSeries(values, 12);
  const ema26 = emaSeries(values, 26);
  const macdLine = ema12.map((value, index) => value - ema26[index]);
  const signalLine = emaSeries(macdLine.slice(26), 9);
  const macdValue = macdLine[macdLine.length - 1];
  const signalValue = signalLine[signalLine.length - 1];
  return {
    macd: macdValue,
    signal: signalValue,
    hist: macdValue - signalValue,
  };
}

export function buildStock(symbol, quote, candles = [], news = []) {
  const closes = candles.map((c) => c.close ?? c.c).filter((v) => typeof v === 'number');
  const volumes = candles.map((c) => c.volume ?? c.v ?? 0);
  const price = quote?.c;
  const prevClose = quote?.pc;
  const open = quote?.o;
  const high = quote?.h;
  const low = quote?.l;
  const dayVolume = quote?.v || volumes[volumes.length - 1] || 0;

  const ma20 = sma(closes, 20);
  const ma50 = sma(closes, 50);
  const ma9 = sma(closes, 9);
  const sd20 = std(closes, 20);
  const upper1 = ma20 && sd20 ? ma20 + sd20 : null;
  const lower1 = ma20 && sd20 ? ma20 - sd20 : null;
  const upper2 = ma20 && sd20 ? ma20 + sd20 * 2 : null;
  const lower2 = ma20 && sd20 ? ma20 - sd20 * 2 : null;
  const avgVol20 = sma(volumes, Math.min(20, volumes.length));
  const rv = avgVol20 ? dayVolume / avgVol20 : 1;
  const rangePct = low ? ((high - low) / low) * 100 : 0;
  const changePct = quote?.dp ?? (prevClose ? ((price - prevClose) / prevClose) * 100 : 0);
  const premarketGapPct = quote?.premarketGapPct || 0;
  const currentRsi = rsi(closes, 14);
  const macdValue = macd(closes);
  const bandwidth = ma20 && upper2 && lower2 ? ((upper2 - lower2) / ma20) * 100 : 0;
  const aboveMa20 = ma20 ? price > ma20 : false;
  const aboveMa50 = ma50 ? price > ma50 : false;
  const breakout = upper1 ? price > upper1 : false;
  const squeeze = bandwidth > 0 && bandwidth < 12;
  const pullback = ma20 ? price >= ma20 && price <= (upper1 || ma20 * 1.02) && changePct > -3 && changePct < 5 : false;
  const openingDrive = open ? price > open && changePct > 3 : false;
  const newsScore = Math.min(news.length * 7, 21);

  let score = 0;
  score += Math.max(0, Math.min(changePct * 2.2, 22));
  score += Math.max(0, Math.min(rv * 8, 24));
  score += Math.max(0, Math.min(rangePct, 10));
  score += aboveMa20 ? 6 : 0;
  score += aboveMa50 ? 6 : 0;
  score += breakout ? 8 : 0;
  score += squeeze ? 4 : 0;
  score += pullback ? 5 : 0;
  score += openingDrive ? 5 : 0;
  score += premarketGapPct > 5 ? 8 : 0;
  score += newsScore;
  score += macdValue.hist && macdValue.hist > 0 ? 7 : 0;
  score += currentRsi && currentRsi >= 50 && currentRsi <= 74 ? 7 : 0;
  score = Math.max(0, Math.min(100, Math.round(score)));

  const tags = [];
  if (premarketGapPct > 5) tags.push('프리마켓 강세');
  if (breakout) tags.push('밴드 돌파');
  if (pullback) tags.push('눌림 후보');
  if (squeeze) tags.push('밴드 수축');
  if (rv >= 2) tags.push('거래량 급증');
  if (news.length > 0) tags.push('뉴스 촉매');
  if (openingDrive) tags.push('개장초 강세');
  if ((currentRsi || 0) >= 75) tags.push('과열 주의');

  const stop = lower1 || price * 0.95;
  const entry = breakout ? Math.max(price, upper1 || price) : pullback ? Math.max(price, ma20 || price * 0.99) : price;
  const target1 = upper2 || price * 1.05;
  const target2 = upper2 ? upper2 * 1.04 : price * 1.1;
  const riskAmount = Math.max(entry - stop, 0.01);
  const rewardAmount = Math.max(target1 - entry, 0.01);
  const rr = rewardAmount / riskAmount;

  const risk = [];
  if ((currentRsi || 0) >= 75) risk.push('RSI가 과열권에 가깝습니다. 추격매수는 보수적으로 접근하세요.');
  if (rv < 1.3) risk.push('거래량 배수가 약합니다. 돌파 실패 가능성을 체크하세요.');
  if (!news.length) risk.push('당일 촉매가 약할 수 있으니 뉴스 재확인이 필요합니다.');
  if (premarketGapPct < 0 && changePct > 0) risk.push('갭 약세 이후 반등일 수 있어 변동성이 커질 수 있습니다.');

  return {
    ticker: symbol,
    price: round(price),
    change: round(quote?.d),
    changePct: round(changePct),
    high: round(high),
    low: round(low),
    open: round(open),
    prevClose: round(prevClose),
    volume: dayVolume,
    rv: round(rv),
    premarketGapPct: round(premarketGapPct),
    rangePct: round(rangePct),
    ma9: round(ma9),
    ma20: round(ma20),
    ma50: round(ma50),
    upper1: round(upper1),
    lower1: round(lower1),
    upper2: round(upper2),
    lower2: round(lower2),
    rsi: round(currentRsi),
    macdHist: round(macdValue.hist, 4),
    bandwidth: round(bandwidth),
    score,
    tags,
    entry: round(entry),
    stop: round(stop),
    target1: round(target1),
    target2: round(target2),
    rr: round(rr),
    candles,
    news,
    risk,
  };
}

export function filterStocksByPreset(stocks, preset) {
  if (preset === 'premarket') return stocks.filter((s) => (s.premarketGapPct || 0) >= 4);
  if (preset === 'breakout') return stocks.filter((s) => s.tags.includes('밴드 돌파') || s.tags.includes('개장초 강세'));
  if (preset === 'pullback') return stocks.filter((s) => s.tags.includes('눌림 후보'));
  if (preset === 'news') return stocks.filter((s) => s.tags.includes('뉴스 촉매'));
  return stocks;
}
