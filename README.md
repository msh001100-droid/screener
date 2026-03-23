# 나스닥 실시간 급등주 스크리너

이중 볼린저밴드(BB1=2σ, BB2=1σ) · 세력매집 · AI분석

## 빠른 시작

### 1. 로컬 실행

```bash
npm install
cp .env.local.example .env.local
# .env.local 파일에 API 키 입력 후:
npm run dev
# http://localhost:3000 접속
```

### 2. Vercel 배포 (5분 완성)

1. [github.com](https://github.com) → New repository → 이 폴더 업로드
2. [vercel.com](https://vercel.com) → New Project → GitHub 연결
3. Environment Variables 설정:
   - `FINNHUB_API_KEY` = `d7095dhr01qtb4r9ui6gd7095dhr01qtb4r9ui70`
   - `ANTHROPIC_API_KEY` = (본인 키 입력)
4. Deploy 클릭 → 완료

## 환경 변수

| 변수 | 설명 | 발급 |
|---|---|---|
| `FINNHUB_API_KEY` | Finnhub API (무료) | finnhub.io |
| `ANTHROPIC_API_KEY` | Claude AI | console.anthropic.com |

## Anthropic API 키 발급 방법

1. https://console.anthropic.com 접속
2. API Keys → Create Key
3. 키 복사 후 Vercel 환경변수에 입력

## 기능

- **실시간 시세**: Finnhub API (서버 경유 → CORS 없음)
- **이중 볼린저밴드**: BB1(2σ) + BB2(1σ) 시각화
- **세력 매집 점수**: 0~100점
- **AI 분석**: Claude Sonnet으로 종합 분석
- **매매가격**: 진입가·손절가·1차·2차 목표가 자동 계산
- **종목 추가**: 원하는 티커 실시간 추가

## 구조

```
screener/
├── pages/
│   ├── index.js          # 메인 스크리너 UI
│   └── api/
│       ├── quote.js      # Finnhub 프록시 (CORS 해결)
│       └── analyze.js    # Anthropic AI 분석
├── components/
│   └── BBChart.js        # 이중BB 시각화
├── lib/
│   └── calc.js           # BB/매집점수 계산
└── styles/
    └── globals.css
```
