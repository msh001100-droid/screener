export const 기본종목 = [
  'SOUN', 'BBAI', 'MARA', 'RIOT', 'ASTS', 'KULR', 'CIFR', 'CLOV', 'LUNR',
  'ACHR', 'PLTR', 'SOFI', 'IONQ', 'OPEN', 'RKLB'
];

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr, mean = avg(arr)) {
  if (!arr.length) return 0;
  const variance = arr.reduce((sum, x) => sum + (x - mean) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

function sma(values, period) {
  if (values.length < period) return null;
  return avg(values.slice(-period));
}

function calcRSI(values, period = 14) {
  if (values.length <= period) return null;
  let gains = 0;
  let losses = 0;
  for (let i = values.length - period; i < values.length; i += 1) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

function bollinger(values, period = 20, mult = 2) {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  const mid = avg(slice);
  const sd = stddev(slice, mid);
  return {
    upper: mid + mult * sd,
    mid,
    lower: mid - mult * sd,
    width: mid ? ((mid + mult * sd) - (mid - mult * sd)) / mid * 100 : 0,
    sd
  };
}

function percent(numerator, denominator) {
  if (!denominator) return 0;
  return (numerator / denominator) * 100;
}

function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

function round(num, digits = 2) {
  if (num === null || num === undefined || Number.isNaN(num)) return null;
  return Number(num.toFixed(digits));
}

export function buildStock(ticker, payload) {
  const price = Number(payload?.quote?.c ?? payload?.c ?? 0);
  const prevClose = Number(payload?.quote?.pc ?? payload?.pc ?? 0);
  const high = Number(payload?.quote?.h ?? payload?.h ?? 0);
  const low = Number(payload?.quote?.l ?? payload?.l ?? 0);
  const open = Number(payload?.quote?.o ?? payload?.o ?? 0);
  const closes = Array.isArray(payload?.candles?.c) ? payload.candles.c.map(Number) : [];
  const times = Array.isArray(payload?.candles?.t) ? payload.candles.t : [];

  if (!price || closes.length < 20) return null;

  const series = [...closes.slice(0, -1), price];
  const ma5 = sma(series, 5);
  const ma20 = sma(series, 20);
  const ma50 = sma(series, 50);
  const rsi14 = calcRSI(series, 14);
  const bb1 = bollinger(series, 20, 1);
  const bb2 = bollinger(series, 20, 2);
  if (!bb1 || !bb2 || !ma20) return null;

  const changePct = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;
  const intradayRangePct = low ? ((high - low) / low) * 100 : 0;
  const distFromMa20 = ma20 ? ((price - ma20) / ma20) * 100 : 0;
  const distFromUpper1 = bb1.upper ? ((price - bb1.upper) / bb1.upper) * 100 : 0;
  const bbPosition = percent(price - bb2.lower, bb2.upper - bb2.lower);
  const squeeze = bb2.width < 8;
  const breakout = price > bb1.upper && price > ma20;
  const riskHot = price > bb2.upper;
  const trendUp = ma5 && ma20 && ma50 ? ma5 > ma20 && ma20 > ma50 : false;
  const pullbackCandidate = price > ma20 && price < bb1.mid;

  let score = 0;
  score += clamp(changePct * 3, -10, 28);
  score += clamp(intradayRangePct * 1.8, 0, 18);
  score += trendUp ? 18 : ma20 && price > ma20 ? 10 : -8;
  score += breakout ? 14 : 0;
  score += squeeze ? 10 : 0;
  score += riskHot ? -10 : 0;
  score += rsi14 !== null ? (rsi14 >= 52 && rsi14 <= 68 ? 10 : rsi14 > 78 ? -8 : 0) : 0;
  score += bbPosition >= 55 && bbPosition <= 85 ? 8 : bbPosition > 100 ? -6 : 0;
  score = clamp(score, 0, 100);

  const stopLoss = ma20 ? Math.min(ma20, bb1.lower) : low;
  const target1 = bb1.upper;
  const target2 = bb2.upper;
  const entry = pullbackCandidate ? bb1.mid : price;

  const tags = [];
  if (trendUp) tags.push('상승추세');
  if (breakout) tags.push('밴드돌파');
  if (squeeze) tags.push('밴드수축');
  if (pullbackCandidate) tags.push('눌림후보');
  if (riskHot) tags.push('과열주의');
  if (rsi14 !== null && rsi14 < 45) tags.push('약세');
  if (rsi14 !== null && rsi14 >= 55 && rsi14 <= 70) tags.push('모멘텀양호');

  return {
    ticker,
    현재가: round(price),
    전일종가: round(prevClose),
    시가: round(open),
    고가: round(high),
    저가: round(low),
    등락률: round(changePct),
    일중변동률: round(intradayRangePct),
    ma5: round(ma5),
    ma20: round(ma20),
    ma50: round(ma50),
    rsi14: round(rsi14),
    bb1상단: round(bb1.upper),
    bb1중단: round(bb1.mid),
    bb1하단: round(bb1.lower),
    bb2상단: round(bb2.upper),
    bb2중단: round(bb2.mid),
    bb2하단: round(bb2.lower),
    밴드폭: round(bb2.width),
    밴드위치: round(bbPosition),
    이격도20: round(distFromMa20),
    상단1이격: round(distFromUpper1),
    매집점수: round(score, 1),
    전략진입가: round(entry),
    '1차목표가': round(target1),
    '2차목표가': round(target2),
    손절가: round(stopLoss),
    태그: tags,
    차트: {
      labels: times.map((t) => new Date(t * 1000).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })),
      closes: series,
      bb1Upper: buildLine(series, 20, 1, 'upper'),
      bb1Mid: buildLine(series, 20, 1, 'mid'),
      bb1Lower: buildLine(series, 20, 1, 'lower'),
      bb2Upper: buildLine(series, 20, 2, 'upper'),
      bb2Mid: buildLine(series, 20, 2, 'mid'),
      bb2Lower: buildLine(series, 20, 2, 'lower'),
      ma20: buildSmaLine(series, 20),
      ma50: buildSmaLine(series, 50)
    },
    분석요약: buildSummary({ ticker, score, changePct, trendUp, breakout, squeeze, rsi14, bbPosition, riskHot })
  };
}

function buildLine(series, period, mult, field) {
  return series.map((_, idx) => {
    const slice = series.slice(0, idx + 1);
    const res = bollinger(slice, period, mult);
    return res ? round(res[field]) : null;
  });
}

function buildSmaLine(series, period) {
  return series.map((_, idx) => {
    const slice = series.slice(0, idx + 1);
    return slice.length >= period ? round(avg(slice.slice(-period))) : null;
  });
}

function buildSummary({ ticker, score, changePct, trendUp, breakout, squeeze, rsi14, bbPosition, riskHot }) {
  const lines = [];
  lines.push(`${ticker}는 현재 실전 점수 ${round(score, 1)}점입니다.`);
  if (trendUp) lines.push('단기-중기 이동평균 구조가 우상향입니다.');
  else lines.push('추세 정렬은 완전하지 않아 추격 매수는 보수적으로 접근하는 편이 좋습니다.');
  if (breakout) lines.push('1표준편차 상단 돌파 구간으로 강한 모멘텀 후보입니다.');
  if (squeeze) lines.push('밴드 폭이 좁아 변동성 확장 전개 가능성이 있습니다.');
  if (rsi14 !== null) lines.push(`RSI(14)는 ${round(rsi14, 1)} 수준입니다.`);
  lines.push(`전일 대비 ${round(changePct, 2)}% 변동 중이며, 볼린저 밴드 위치는 ${round(bbPosition, 1)}%입니다.`);
  if (riskHot) lines.push('현재 가격이 2표준편차 상단 위라 단기 과열 가능성도 같이 봐야 합니다.');
  return lines.join(' ');
}

export function 규칙기반AI(stock) {
  if (!stock) return '';
  const rr1 = stock.현재가 && stock.손절가 ? ((stock['1차목표가'] - stock.현재가) / ((stock.현재가 - stock.손절가) || 1)) : 0;
  return [
    `종목: ${stock.ticker}`,
    `실전 점수: ${stock.매집점수} / 100`,
    `핵심 태그: ${stock.태그.join(', ') || '없음'}`,
    `상황 요약: ${stock.분석요약}`,
    `관심 진입 구간: ${stock.전략진입가} 부근`,
    `손절 기준: ${stock.손절가} 이탈 시 빠른 대응`,
    `1차 목표가: ${stock['1차목표가']}`,
    `2차 목표가: ${stock['2차목표가']}`,
    `예상 보상/위험(대략): ${round(rr1, 2)}R`,
    `실전 체크포인트: 시가 위 유지, 20일선 지지, 상단 밴드 안착 여부를 함께 확인하세요.`
  ].join('\n');
}
