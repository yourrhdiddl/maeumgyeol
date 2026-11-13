# 마음결 AI 책방 (MindTexture AI Bookstore) 📚🌌

> 감정의 결을 섬세하게 읽어내어 따뜻한 공감 대화와 맞춤형 도서 3권을 큐레이션해 주는 지능형 감정 서재 플랫폼입니다.

- **사이트**: https://yourrhdiddl.github.io/maeumgyeol/ (GitHub Pages)
- **AI 서버**: https://maeumgyeol.ai.studio (Google AI Studio → Cloud Run)

---

## ✨ 핵심 기능 (Key Features)

1. **30가지 감정 정밀 분석 & 큐레이션**
   - 사용자 발화 속 숨겨진 감정의 결(기쁨, 설렘, 불안, 슬픔, 분노, 무기력 등 30개 카테고리)을 다각도로 분석합니다.
   - 감정 분석 사유와 함께 엄선된 도서 3권 및 **책 소개와 겹치지 않는 도서별 맞춤 추천 이유**를 제공합니다.

2. **Gemini 3.8 Flash & 무중단 휴리스틱 폴백 엔진**
   - 최신 Gemini 3.8 Flash 모델과 Thinking 파라미터 제어를 지원합니다.
   - AI 서버에 연결할 수 없거나 응답이 늦으면, 감탄사(히히·하...·ㅠㅠ)·상황 문장(리젝·탈락·읽씹)·감정 키워드를 읽는 자체 휴리스틱 엔진(`analyzeNuanceHeuristic`)이 바로 답합니다.

3. **생명존중 위기 감지 시스템 (Crisis Intervention)**
   - 자해/자살 등 위기 키워드 감지 시 즉시 보호 모드로 전환되며 24시간 상담 전화(109) 안내 카드와 따뜻한 보호 메시지를 출력합니다.

4. **Gemini 코스믹 다크 UI/UX (Pretendard)**
   - 딥 네이비/퍼플 그라디언트와 2분할 뷰(좌측 공감 대화 스트림, 우측 추천 서재 덱)를 제공합니다.
   - 모바일 375px부터 데스크톱까지 대응하는 반응형 레이아웃입니다.

5. **관리자 모드 (Admin Console)**
   - 단축키(`Ctrl/Cmd + Shift + A`)로 진입하는 숨김 관리자 모드.
   - 서버 환경변수 `ADMIN_PASSWORD`로 확인하는 비밀번호 로그인(12시간 유지, 연속 실패 시 잠금).
   - 시스템 프롬프트 모듈별 튜닝, 감정별 연관 키워드 탐색기, 위기 감지 단어 모니터링 기능 탑재.

---

## 🛠 기술 스택 (Tech Stack)

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Motion
- **Backend**: Node.js, Express, @google/genai SDK (Gemini 3.8 Flash)
- **Build & Dev Tool**: Vite 8, esbuild, tsx
- **Container**: Docker (Multi-stage build)

---

## 🚀 로컬 실행 방법 (Local Development)

### 1. 패키지 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.env.example` 파일을 복사하여 `.env` 파일을 만들고 값을 채웁니다.
```bash
cp .env.example .env
```

| 변수 | 설명 |
|---|---|
| `GEMINI_API_KEY` | Gemini API 키. 없으면 휴리스틱 엔진만으로 동작합니다. |
| `ADMIN_PASSWORD` | 관리자 로그인 비밀번호. 비워 두면 관리자 로그인이 꺼집니다. |
| `CORS_ORIGINS` | 이 서버의 `/api`를 부를 수 있는 다른 화면 주소 (기본: `https://yourrhdiddl.github.io`) |
| `CHAT_RATE_LIMIT_PER_MIN` | 같은 IP의 1분당 채팅 수 제한 (기본 10) |

### 3. 개발 서버 실행
```bash
npm run dev
```
브라우저에서 [http://localhost:3000](http://localhost:3000)으로 접속합니다.

---

## 📦 프로덕션 빌드 & 실행 (Production Build)

```bash
# 프론트엔드 빌드 및 서버 번들링
npm run build

# 프로덕션 서버 실행
npm run start
```

---

## ☁️ 배포 구조 (Deployment)

### GitHub Pages (화면)
- `main`에 push하면 `.github/workflows/pages.yml`이 React 화면을 빌드해 GitHub Pages에 올립니다.
- 채팅·관리자 요청은 저장소 변수 `API_BASE`(Settings → Secrets and variables → Actions → Variables)의 서버로 보냅니다.

### Google AI Studio → Cloud Run (AI 서버)
- AI Studio 앱이 이 저장소와 GitHub 동기화되어 있습니다. AI Studio에서 **Pull** 후 **Publish**하면 서버가 갱신됩니다.
- AI Studio Secrets에 `GEMINI_API_KEY`, `ADMIN_PASSWORD`를 설정합니다.

### Firebase Hosting (화면)
- Firebase에는 화면만 올리고, 채팅·관리자 요청은 `.env.firebase`의 `VITE_API_BASE` 서버(AI Studio)로 보냅니다.
- 처음 한 번만:
  1. [Firebase 콘솔](https://console.firebase.google.com)에서 프로젝트를 만듭니다.
  2. `npx firebase-tools login` 으로 로그인합니다.
  3. `npx firebase-tools use --add` 로 만든 프로젝트를 고릅니다. (`.firebaserc`가 생깁니다)
  4. AI Studio Secrets의 `CORS_ORIGINS`에 Firebase 주소를 추가하고 Publish합니다.
     예: `https://yourrhdiddl.github.io,https://프로젝트ID.web.app,https://프로젝트ID.firebaseapp.com`
- 배포할 때마다: `npm run deploy:firebase`

### 그 밖의 방법
- **Render**: 저장소의 `render.yaml`로 Web Service를 만들 수 있습니다.
- **Docker / Cloud Run**: 저장소의 Multi-stage `Dockerfile`로 이미지를 빌드할 수 있습니다. 서버는 `PORT` 환경변수를 읽습니다.

```bash
docker build -t maeumgyeol .
docker run -d -p 3000:3000 -e GEMINI_API_KEY="YOUR_GEMINI_API_KEY" maeumgyeol
```

---

## 📄 라이선스 (License)

Apache-2.0 License
