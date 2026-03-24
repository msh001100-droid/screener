import { DEFAULT_UNIVERSE } from "./universe";

function seededValue(seed) {
  let x = 0;
  for (let i = 0; i < seed.length; i++) x += seed.charCodeAt(i) * (i + 1);
  return x;
}

export function demoQuote(symbol) {
  const s = seededValue(symbol);
  const base = (s % 1800) / 100 + 0.8;
  const drift = ((s % 17) - 8) / 100;
  const c = Number((base * (1 + drift)).toFixed(2));
  const pc = Number((c / (1 + drift || 1)).toFixed(2));
  return { c, pc, h: Number((c * 1.05).toFixed(2)), l: Number((c * 0.95).toFixed(2)) };
}

export function demoCandles(symbol) {
  const s = seededValue(symbol);
  const arr = [];
  const vol = [];
  let p = ((s % 1300) / 100) + 1;
  for (let i = 0; i < 60; i++) {
    const wobble = (((s + i * 7) % 9) - 4) / 100;
    p = Math.max(0.5, p * (1 + wobble / 2));
    arr.push(Number(p.toFixed(2)));
    vol.push(150000 + ((s + i * 1234) % 900000));
  }
  return { c: arr, v: vol };
}

export function demoNews(symbol) {
  const hot = ["QUBT","RGTI","IONQ","MARA","RIOT","ASTS","BBAI","SOUN","SMR","OKLO"];
  if (!hot.includes(symbol)) return [];
  return [
    {
      headline: `${symbol} 관련 호재성 기사 데모`,
      source: "DEMO",
      url: "#"
    }
  ];
}

export function demoScanUniverse() {
  return DEFAULT_UNIVERSE.slice(0, 30);
}
