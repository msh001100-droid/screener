# 나스닥 실시간 급등주 스크리너

## 배포 방법 (Vercel - 완전 무료)

### 1단계: API 키 발급 (모두 무료)
- **Finnhub**: https://finnhub.io → 회원가입 → API Key 복사
- **Groq**: https://console.groq.com → 회원가입 → API Keys → 키 발급

### 2단계: Vercel 배포
1. https://vercel.com 로그인
2. Add New Project → 이 폴더 드래그앤드롭
3. Environment Variables 추가:
   - `FINNHUB_API_KEY` = Finnhub 키
   - `GROQ_API_KEY` = Groq 키
4. **Deploy** 클릭

⚠️ 환경변수 추가 후 반드시 **Redeploy** 해야 적용됩니다.

### API 동작 확인
배포 후 브라우저에서:
```
https://내사이트.vercel.app/api/quote?symbol=AAPL
```
결과: `{"ok":true,"data":{"c":195.5,...}}` → 정상

### 로컬 실행
```bash
npm install
cp .env.local.example .env.local
# .env.local에 API 키 입력
npm run dev
# http://localhost:3000
```
