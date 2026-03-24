function seedFrom(text) {
  let n = 0;
  for (let i = 0; i < text.length; i++) {
    n += text.charCodeAt(i) * (i + 1);
  }
  return n;
}

export function demoQuote(symbol) {
  const s = seedFrom(symbol);
  const base = ((s % 1500) / 100) + 1;
  const drift = ((s % 21) - 10) / 100;
  const c = Number((base * (1 + drift)).toFixed(2));
  const pc = Number((base).toFixed(2));
  return {
    c,
    pc,
    h: Number((c * 1.05).toFixed(2)),
    l: Number((c * 0.95).toFixed(2))
  };
}

export function demoCandles(symbol) {
  const s = seedFrom(symbol);
  const c = [];
  const v = [];
  let price = ((s % 1200) / 100) + 1;
  for (let i = 0; i < 60; i++) {
    const move = (((s + i * 13) % 9) - 4) / 100;
    price = Math.max(0.5, price * (1 + move / 2));
    c.push(Number(price.toFixed(2)));
    v.push(100000 + ((s + i * 991) % 900000));
  }
  return { c, v };
}

export function demoNews(symbol) {
  const hot = ["QUBT", "RGTI", "IONQ", "MARA", "ASTS", "SMR", "BBAI", "SOUN"];
  if (!hot.includes(symbol)) return [];
  return [
    {
      headline: `${symbol} 데모 뉴스`,
      source: "DEMO",
      url: "#"
    }
  ];
}
