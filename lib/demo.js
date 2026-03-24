function seedFromSymbol(symbol) {
  return symbol.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}

function rand(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function demoCandles(symbol, days = 120) {
  const seed = seedFromSymbol(symbol);
  let price = 1 + (seed % 350) / 14;
  const now = Date.now();
  const rows = [];

  for (let i = days; i >= 0; i -= 1) {
    const s = seed + i * 13;
    const phase = rand(s) - 0.47;
    const swing = 0.02 + rand(s + 1) * 0.08;
    const open = price;
    const close = Math.max(0.25, open * (1 + phase * 0.12));
    const high = Math.max(open, close) * (1 + swing * 0.45);
    const low = Math.min(open, close) * (1 - swing * 0.35);
    const volume = Math.floor(600000 + rand(s + 7) * 12000000);
    price = close;
    rows.push({
      date: Math.floor((now - i * 86400000) / 1000),
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume,
    });
  }

  return rows;
}

export function demoQuote(symbol) {
  const candles = demoCandles(symbol, 45);
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const premarketGapPct = Number((((last.open - prev.close) / prev.close) * 100).toFixed(2));
  return {
    c: last.close,
    d: Number((last.close - prev.close).toFixed(2)),
    dp: Number((((last.close - prev.close) / prev.close) * 100).toFixed(2)),
    h: last.high,
    l: last.low,
    o: last.open,
    pc: prev.close,
    t: last.date,
    v: last.volume,
    premarketGapPct,
  };
}

export function demoNews(symbol) {
  const themes = ['AI 인프라', '프리마켓 급등', '계약 수주', '실적 기대', '거래량 유입'];
  return Array.from({ length: 5 }).map((_, i) => ({
    id: `${symbol}-${i}`,
    headline: `${symbol} ${themes[i]} 관련 데모 뉴스`,
    summary: `${symbol} 종목에 대한 데모 뉴스입니다. 실제 투자 전에는 실시간 뉴스와 공시를 반드시 다시 확인하세요.`,
    source: 'DEMO',
    url: `https://example.com/${symbol}/${i}`,
    datetime: Math.floor((Date.now() - i * 3600000) / 1000),
  }));
}
