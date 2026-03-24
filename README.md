# 📈 나스닥 실전형 급등주 스크리너 v2.0

센트로용으로 실전 매매에 더 맞게 개조한 **Next.js 기반 나스닥 급등주 스크리너**입니다.

## 핵심 업그레이드

- **실전형 점수 체계**
  - 추세 + 변동성 + 위치 + 쐐기/수축 + 단기 모멘텀 + 리스크 반영
- **이중 볼린저밴드 시각화**
  - 20일 기준 1표준편차 / 2표준편차 동시 표시
- **실시간 추적**
  - 선택 종목 15초 자동 갱신
- **워치리스트 영속화**
  - localStorage 저장
- **즉시 스캔 / 개별 추가 / 정렬 / 필터**
- **TradingView 1클릭 이동**
- **Groq AI 단타 요약**
  - 키가 있으면 AI 분석, 없으면 규칙 기반 분석 자동 제공
- **API 키가 없어도 데모 모드 안내**

## 폴더 구조

```bash
nasdaq-screener/
├─ components/
│  └─ BBChart.js
├─ lib/
│  └─ calc.js
├─ pages/
│  ├─ api/
│  │  ├─ analyze.js
│  │  └─ quote.js
│  ├─ _app.js
│  └─ index.js
├─ styles/
│  └─ globals.css
├─ .env.local.example
├─ .gitignore
├─ next.config.js
├─ package.json
└─ README.md
```

## 실행 방법

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

브라우저에서 `http://localhost:3000`

## 환경 변수

### 필수
- `FINNHUB_API_KEY`

### 선택
- `GROQ_API_KEY`

## Vercel 배포

1. GitHub에 업로드
2. Vercel에서 Import
3. Environment Variables 설정
   - `FINNHUB_API_KEY`
   - `GROQ_API_KEY` (선택)
4. Redeploy

## 실전 사용 팁

- **기본 스캔은 15개 종목** 기준입니다. Finnhub 무료 요금제에서 너무 많은 종목을 동시에 돌리면 제한에 걸릴 수 있습니다.
- 급등주 실전 운용은 아래 순서가 좋습니다.
  1. 스캔 후 상위 점수 3~5개 압축
  2. TradingView에서 거래량/프리마켓/시가 위치 확인
  3. AI 요약 또는 규칙 분석으로 진입/손절/목표가 검토
  4. 한 종목에 몰빵하지 않기
- 무료 Finnhub는 거래량·체결강도·호가창이 제한적이므로 **최종 진입 판단은 차트와 실제 체결 흐름을 함께 확인**하는 것이 좋습니다.

## 한계

- Finnhub 무료 API는 분당 호출 제한이 있습니다.
- 초단타 실전에서 가장 중요한 **실시간 호가창/틱 체결/프리마켓 체결강도**는 별도 유료 데이터가 더 적합합니다.
- 이 앱은 **후보 압축 + 우선순위 선정**에는 매우 유용하지만, 최종 체결 판단까지 100% 대체하지는 않습니다.

## 추천 확장

- 프리마켓 갭 조건 필터 추가
- 뉴스 API 연동
- 시총, float, short interest 외부 데이터 결합
- 고정 손절 % 대신 ATR 기반 손절 적용

