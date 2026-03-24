const API_BASE = "https://finnhub.io/api/v1";

export function isDemoMode() {
  return String(process.env.NEXT_PUBLIC_DEMO_MODE || "").toLowerCase() === "true";
}

function getApiKey() {
  return process.env.FINNHUB_API_KEY || "";
}

async function request(path, params) {
  const token = getApiKey();
  if (!token) {
    throw new Error("FINNHUB_API_KEY가 없습니다.");
  }
  const qs = new URLSearchParams({ ...params, token }).toString();
  const res = await fetch(`${API_BASE}${path}?${qs}`);
  if (!res.ok) {
    throw new Error(`Finnhub 호출 실패: ${res.status}`);
  }
  return await res.json();
}

export async function searchSymbols(q) {
  return await request("/search", { q });
}

export async function getQuote(symbol) {
  return await request("/quote", { symbol });
}

export async function getCandles(symbol) {
  const now = Math.floor(Date.now() / 1000);
  const from = now - 60 * 60 * 24 * 90;
  return await request("/stock/candle", {
    symbol,
    resolution: "D",
    from,
    to: now
  });
}

export async function getNews(symbol) {
  const today = new Date();
  const from = new Date(today.getTime() - 1000 * 60 * 60 * 24 * 7);
  return await request("/company-news", {
    symbol,
    from: from.toISOString().slice(0, 10),
    to: today.toISOString().slice(0, 10)
  });
}

export async function sleep(ms) {
  return await new Promise((resolve) => setTimeout(resolve, ms));
}
