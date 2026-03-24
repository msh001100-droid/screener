# 📈 Centro Pro v1.4 - 나스닥 급등주 실전 스크리너

프리마켓 갭, 뉴스 촉매, 거래량 배수, 이중 볼린저밴드, 눌림목/돌파/개장초 전략을 한 화면에서 확인하는 Next.js 기반 스크리너입니다.

## 핵심 기능
- 프리셋 4종
  - 프리마켓 강세
  - 개장초 돌파
  - 눌림목 반등
  - 뉴스 촉매 우선
- 점수 기반 후보 압축
- 이중 볼린저밴드 차트
- 진입가 / 손절가 / 1차 / 2차 목표가 자동 계산
- 리스크 리워드 비율 표시
- 최근 뉴스 5개 표시
- 선택 종목 15초 라이브 갱신
- 워치리스트 localStorage 저장
- DEMO 모드 지원
- Groq AI 분석 지원 (키 없으면 규칙 기반 분석)

## 실행
```bash
npm install
npm run dev
```

## 환경변수
`.env.local` 파일 생성:
```env
FINNHUB_API_KEY=your_key
GROQ_API_KEY=your_key
NEXT_PUBLIC_DEMO_MODE=false
```

테스트만 할 때:
```env
NEXT_PUBLIC_DEMO_MODE=true
```

## GitHub 업로드
이 프로젝트 폴더 전체를 그대로 GitHub에 올리면 됩니다.

## 배포
Vercel에 업로드 후 환경변수만 넣으면 바로 배포 가능합니다.

## 주의
- Finnhub 무료 플랜은 분당 호출 제한이 있습니다.
- 이 앱은 후보 압축과 자리 판단에는 유용하지만, 초단타 최종 체결 판단은 TradingView/호가창과 같이 보는 것이 좋습니다.
