import { 규칙기반AI } from '../../lib/calc';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'POST만 지원합니다.' });
  }

  const stock = req.body?.stock;
  if (!stock) {
    return res.status(400).json({ ok: false, error: 'stock 데이터가 필요합니다.' });
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return res.status(200).json({ ok: true, source: 'rule', text: 규칙기반AI(stock) });
  }

  try {
    const prompt = [
      '당신은 초단타와 스윙 사이를 구분해서 설명하는 한국어 트레이딩 보조 AI입니다.',
      '아래 종목을 실전형 관점으로 분석하세요.',
      '형식:',
      '1) 현재 상태',
      '2) 진입 관점',
      '3) 손절 기준',
      '4) 목표가 관점',
      '5) 지금 추격매수 위험도',
      '6) 한 줄 결론',
      '',
      JSON.stringify(stock, null, 2)
    ].join('\n');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Groq API 호출 실패');
    }

    const json = await response.json();
    const text = json?.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error('AI 응답이 비었습니다.');

    return res.status(200).json({ ok: true, source: 'groq', text });
  } catch (error) {
    return res.status(200).json({ ok: true, source: 'rule-fallback', text: 규칙기반AI(stock), warning: error.message });
  }
}
