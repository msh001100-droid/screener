function fallback(stock) {
  if (!stock) return "분석할 종목 데이터가 없습니다.";
  const trend = stock.price > stock.ma20 ? "단기 추세 우위" : "단기 추세 약세";
  const volume = stock.rvol >= 2 ? "거래량 동반" : "거래량은 평범";
  const news = stock.hasNews ? "최근 뉴스 촉매 있음" : "뚜렷한 뉴스 촉매는 약함";
  return [
    `${stock.ticker} 규칙 기반 분석입니다.`,
    `현재 점수는 ${stock.score}점이며 ${trend} 상태입니다.`,
    `${volume}, RSI ${stock.rsi14}, MACD 히스토그램 ${stock.macdHist}입니다.`,
    `${news}.`,
    `전략 기준으로는 ${stock.entry} 부근 확인 후 진입, ${stock.stop} 이탈 시 손절, 목표는 ${stock.target1} / ${stock.target2}를 우선 체크하는 방식이 무난합니다.`,
    `단, 개장 직후에는 스프레드와 체결강도를 반드시 같이 확인하세요.`
  ].join(" ");
}

export default async function handler(req, res) {
  try {
    const stock = req.body?.stock;
    if (!stock) return res.status(400).json({ ok: false, error: "stock 데이터가 필요합니다." });
    return res.status(200).json({ ok: true, text: fallback(stock), source: "rule-based" });
  } catch (e) {
    return res.status(200).json({ ok: false, error: e.message || "분석 실패" });
  }
}
