function fallbackAnalysis(stock) {
  const positives = [];
  const cautions = [];

  if ((stock.premarketGapPct || 0) >= 4) positives.push(`프리마켓 갭이 ${stock.premarketGapPct}%로 강합니다.`);
  if ((stock.rv || 0) >= 2) positives.push(`거래량 배수가 ${stock.rv}배로 수급 유입이 보입니다.`);
  if ((stock.rr || 0) >= 1.5) positives.push(`리스크 대비 보상 비율이 ${stock.rr}:1 수준입니다.`);
  if ((stock.rsi || 0) >= 75) cautions.push('RSI가 높아 추격매수 위험이 있습니다.');
  if ((stock.rv || 0) < 1.3) cautions.push('거래량 확증이 약합니다.');
  if (!stock.news?.length) cautions.push('뉴스 촉매가 약하니 공시와 헤드라인 재확인이 필요합니다.');

  return [
    `[${stock.ticker}] 규칙 기반 분석`,
    '',
    '강점',
    ...(positives.length ? positives.map((t) => `- ${t}`) : ['- 현재 가격 구조는 나쁘지 않지만 확증 신호는 제한적입니다.']),
    '',
    '전략',
    `- 진입가: $${stock.entry}`,
    `- 손절가: $${stock.stop}`,
    `- 1차 목표가: $${stock.target1}`,
    `- 2차 목표가: $${stock.target2}`,
    '',
    '주의',
    ...(cautions.length ? cautions.map((t) => `- ${t}`) : ['- 급등주는 변동성이 크므로 분할 접근이 적합합니다.']),
  ].join('\n');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method not allowed' });

  const stock = req.body?.stock;
  if (!stock) return res.status(400).json({ ok: false, error: 'stock required' });

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return res.status(200).json({ ok: true, analysis: fallbackAnalysis(stock), fallback: true });
  }

  try {
    const prompt = `당신은 나스닥 급등주 단타 트레이더입니다. 아래 데이터를 바탕으로 한국어로 매우 실전적으로 요약하세요.\n\n티커: ${stock.ticker}\n현재가: ${stock.price}\n등락률: ${stock.changePct}%\n프리마켓 갭: ${stock.premarketGapPct}%\n거래량 배수: ${stock.rv}x\nRSI: ${stock.rsi}\nMACD Hist: ${stock.macdHist}\n점수: ${stock.score}\n태그: ${(stock.tags || []).join(', ')}\n진입가: ${stock.entry}\n손절가: ${stock.stop}\n1차 목표가: ${stock.target1}\n2차 목표가: ${stock.target2}\n리스크: ${(stock.risk || []).join(' / ')}\n\n출력 형식:\n1. 현재 해석\n2. 진입 전략\n3. 손절/익절\n4. 한 줄 결론`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.35,
      }),
    });

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('AI 응답이 비어 있습니다.');
    return res.status(200).json({ ok: true, analysis: content });
  } catch (error) {
    return res.status(200).json({ ok: true, analysis: fallbackAnalysis(stock), fallback: true, error: error.message });
  }
}
