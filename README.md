# Nasdaq Screener Centro Clean

지금까지 나온 오류를 기준으로 다시 만든 **안정형 Next.js 버전**입니다.

## 핵심 수정
- `react` / `react-dom` 버전 완전 통일: `18.2.0`
- `next`는 `14.2.29` 고정
- 외부 UI 라이브러리 없이 순수 Next + React만 사용
- 검색 / 개별 종목 조회 / 워치리스트 스캔 구조 단순화
- Finnhub 무료 한도를 고려해 스캔 개수 제한
- API 키가 없어도 동작 확인 가능한 DEMO 모드 지원

## 설치
```bash
npm install
npm run dev
```

## .env.local 예시
```env
FINNHUB_API_KEY=여기에_키
NEXT_PUBLIC_DEMO_MODE=true
```

실데이터 사용 시:
```env
NEXT_PUBLIC_DEMO_MODE=false
```

## 권장 사용법
1. 티커 검색
2. 워치리스트 추가
3. 워치리스트 스캔
4. 상위 후보만 차트/호가로 최종 확인

## 중요
무료 API 기준으로 이 앱은 **후보 압축용**입니다.
기관형 전수 스캐너처럼 쓰는 용도는 아닙니다.
