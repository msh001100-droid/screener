export const DEFAULT_UNIVERSE = [
  "SOUN","BBAI","CXAI","AI","QUBT","RGTI","IONQ","QBTS","LAES","NOTE",
  "MARA","RIOT","CIFR","CLSK","WULF","BTBT","IREN","HUT","CORZ","ARBK",
  "ASTS","GSAT","RKLB","LUNR","PL","BKSY","SATL","SPIR","KULR","INTC",
  "FFIE","MULN","NKLA","LCID","RIVN","CHPT","EVGO","BLNK","GOEV","ENVX",
  "BNGO","SANA","CRBU","EDIT","BEAM","NTLA","VERV","RXRX","SDGR","ABCL",
  "SMR","OKLO","NNE","VST","CEG","TLN","UUUU","CCJ","DNN","LEU",
  "PLTR","SOFI","HIMS","TEM","UPST","AFRM","OPEN","CAVA","HOOD","APP",
  "ACHR","JOBY","KTOS","AVAV","SABS","ARDS","AKTS","PRSO","OPTT","ONDS"
];

export const PRESETS = {
  "전체 후보": DEFAULT_UNIVERSE,
  "AI/양자": ["SOUN","BBAI","CXAI","AI","QUBT","RGTI","IONQ","QBTS","RXRX","SDGR","ABCL","TEM","NOTE"],
  "크립토/고베타": ["MARA","RIOT","CIFR","CLSK","WULF","BTBT","IREN","HUT","CORZ","ARBK","HOOD","COIN"],
  "우주/방산": ["ASTS","GSAT","RKLB","LUNR","PL","BKSY","SATL","SPIR","ACHR","JOBY","KTOS","AVAV"],
  "EV/배터리": ["FFIE","MULN","NKLA","LCID","RIVN","CHPT","EVGO","BLNK","GOEV","ENVX","KULR"],
  "바이오/유전자": ["BNGO","SANA","CRBU","EDIT","BEAM","NTLA","VERV","ABCL","SABS","ARDS"]
};

export function localSearchUniverse(q = "") {
  const keyword = String(q || "").trim().toUpperCase();
  if (!keyword) return DEFAULT_UNIVERSE.slice(0, 25).map((ticker) => ({ symbol: ticker, description: "기본 후보군" }));
  return DEFAULT_UNIVERSE
    .filter((ticker) => ticker.includes(keyword))
    .slice(0, 25)
    .map((ticker) => ({ symbol: ticker, description: "기본 후보군 매치" }));
}
