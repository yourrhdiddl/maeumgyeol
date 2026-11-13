# 마음결 AI 책방 - Cloud Run 배포용 이미지
# 1단계: 화면(Vite)과 서버(server.ts)를 빌드
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# 2단계: 실행에 필요한 것만 담아 가볍게 실행
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
# Cloud Run이 PORT(기본 8080)를 넘겨 주고, 서버는 그 포트로 실행돼요
CMD ["node", "dist/server.js"]
