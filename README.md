# 나스닥 실시간 급등주 스크리너 (수정 버전)

## 수정 사항 (멈춤 현상 해결)

| 문제 | 원인 | 해결 |
|---|---|---|
| 스캔이 멈춤 | 15개 동시 API 호출 → Vercel 10초 타임아웃 | 단일 티커씩 순차 호출 |
| 목록이 안 나옴 | 전체 완료 후 한번에 표시 | 로드 즉시 실시간 표시 |
| Rate Limit | 동시 15콜 → 429 오류 | 250ms 간격 순차 호출 |

## API 키 (모두 무료)

| 서비스 | 발급처 | 비용 |
|---|---|---|
| Finnhub | finnhub.io | 무료 |
| Groq (AI) | console.groq.com | 무료 |
| Vercel | vercel.com | 무료 |

## 배포 방법

1. GitHub에 업로드
2. vercel.com → New Project → Import
3. Environment Variables:
   - `FINNHUB_API_KEY` = Finnhub 키
   - `GROQ_API_KEY` = Groq 키
4. Deploy

## 로컬 실행

```bash
npm install
cp .env.local.example .env.local
# .env.local에 API 키 입력
npm run dev
```
