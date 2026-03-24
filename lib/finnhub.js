const API = "https://finnhub.io/api/v1";

export function isDemoMode() {
  return String(process.env.NEXT_PUBLIC_DEMO_MODE || "").toLowerCase() === "true";
}

function apiKey() {
  return process.env.FINNHUB_API_KEY || "";
}

export async function finnhubFetch(path, params = {}) {
  const key = apiKey();
  if (!key) throw new Error("FINNHUB_API_KEY가 없습니다.");
  const qs = new URLSearchParams({ ...params, token: key }).toString();
  const res = await fetch(`${API}${path}?${qs}`);
  if (!res.ok) {
    throw new Error(`Finnhub 호출 실패: ${res.status}`);
  }
  return await res.json();
}

export async function searchSymbol(q) {
  return await finnhubFetch("/search", { q });
}

export async function getQuote(symbol) {
  return await finnhubFetch("/quote", { symbol });
}

export async function getCandles(symbol) {
  const now = Math.floor(Date.now() / 1000);
  const from = now - 60 * 60 * 24 * 90;
  return await finnhubFetch("/stock/candle", {
    symbol,
    resolution: "D",
    from,
    to: now
  });
}

export async function getNews(symbol) {
  const today = new Date();
  const from = new Date(today.getTime() - 1000 * 60 * 60 * 24 * 7);
  const f = from.toISOString().slice(0, 10);
  const t = today.toISOString().slice(0, 10);
  return await finnhubFetch("/company-news", {
    symbol,
    from: f,
    to: t
  });
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
