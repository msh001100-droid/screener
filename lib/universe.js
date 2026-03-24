export const DEFAULT_WATCHLIST = [
  "SOUN", "BBAI", "QUBT", "RGTI", "IONQ", "MARA", "ASTS", "SMR"
];

export const SEARCH_POOL = [
  "SOUN","BBAI","QUBT","RGTI","IONQ","QBTS","MARA","RIOT","CIFR","CLSK",
  "ASTS","RKLB","LUNR","PL","SMR","OKLO","NNE","TEM","ABCL","RXRX",
  "PLTR","SOFI","HIMS","APP","HOOD","RIVN","LCID","CHPT","KULR","ONDS",
  "OPTT","PRSO","BNGO","SANA","EDIT","BEAM","NTLA","VERV","GSAT","JOBY"
];

export function localSearch(query) {
  const q = String(query || "").trim().toUpperCase();
  if (!q) {
    return SEARCH_POOL.slice(0, 20).map((symbol) => ({
      symbol,
      description: "기본 검색 후보"
    }));
  }
  return SEARCH_POOL
    .filter((symbol) => symbol.includes(q))
    .slice(0, 20)
    .map((symbol) => ({
      symbol,
      description: "기본 검색 후보"
    }));
}
