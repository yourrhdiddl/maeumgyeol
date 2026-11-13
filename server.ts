import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import {
  EMOTION_DATABASE,
  EMPATHY_SENTENCES,
  CRISIS_REGEX,
  findEmotion,
  analyzeNuanceHeuristic,
} from "./src/data/bookstoreDb.ts";
import {
  AIAdminConfig,
  DEFAULT_ADMIN_CONFIG,
  buildCompiledSystemPrompt,
} from "./src/data/adminConfig.ts";
import { analyzeLocally, generateDistinctFits } from "./src/data/localAnalysis.ts";
import { TONE_PRESETS } from "./src/data/adminConfig.ts";
import { checkPassword, issueToken, isValidToken, requireAdmin, tokenFromRequest } from "./adminAuth.ts";

// 일반 방문자가 보낸 설정 중 허용하는 값(말투, 추론 깊이)만 골라요
function pickGuestOverride(o: any): Partial<AIAdminConfig> {
  const out: Partial<AIAdminConfig> = {};
  if (o && typeof o === "object") {
    if (typeof o.activeToneKey === "string" && o.activeToneKey in TONE_PRESETS) out.activeToneKey = o.activeToneKey;
    if (o.thinkingLevel === "LOW" || o.thinkingLevel === "MEDIUM" || o.thinkingLevel === "HIGH") out.thinkingLevel = o.thinkingLevel;
  }
  return out;
}

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Cloud Run 등은 PORT 환경변수로 포트를 알려 줘요. 없으면 로컬 기본값 3000
const port = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === "production";

// 요청 본문은 64KB까지만 받아요 (관리자 설정의 긴 시스템 프롬프트도 들어갈 만큼)
app.use(express.json({ limit: "64kb" }));
// Cloud Run 같은 프록시 뒤에서도 접속자 IP(req.ip)를 바르게 읽도록
// true 로 두면 방문자가 X-Forwarded-For 에 아무 IP나 적어 횟수 제한·로그인 잠금을 피할 수 있어요.
// 그래서 바로 앞의 프록시(Cloud Run) 1단계가 붙여 준 IP만 믿어요.
app.set("trust proxy", 1);

// GitHub Pages 같은 다른 주소의 화면이 이 서버의 /api 를 부를 수 있게 허용 (CORS)
// CORS_ORIGINS 환경변수에 쉼표로 여러 개 넣을 수 있어요. 기본값은 GitHub Pages 주소
const allowedOrigins = (process.env.CORS_ORIGINS || "https://yourrhdiddl.github.io")
  .split(",")
  .map((s) => s.trim().replace(/\/+$/, ""))
  .filter(Boolean);
app.use("/api", (req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Max-Age", "600");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// 채팅 사용량 제한: 같은 IP에서 1분에 10번까지 (주소가 공개돼도 Gemini 사용료가 갑자기 늘지 않게)
const CHAT_LIMIT = Number(process.env.CHAT_RATE_LIMIT_PER_MIN) || 10;
const MAX_CHAT_CHARS = 500; // 채팅 한 번에 보낼 수 있는 최대 글자 수
const chatHits = new Map<string, number[]>();
function chatRateLimit(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ip = req.ip || "unknown";
  const now = Date.now();
  const recent = (chatHits.get(ip) || []).filter((t) => now - t < 60_000);
  if (recent.length >= CHAT_LIMIT) {
    chatHits.set(ip, recent);
    return res.status(429).json({ error: "요청이 너무 많아요. 1분 뒤에 다시 시도해 주세요." });
  }
  recent.push(now);
  chatHits.set(ip, recent);
  if (chatHits.size > 5000) chatHits.clear(); // 메모리 보호
  next();
}

// In-memory active admin config
let currentAdminConfig: AIAdminConfig = { ...DEFAULT_ADMIN_CONFIG };

// 관리자 로그인: 비밀번호(ADMIN_PASSWORD)를 확인하고 12시간짜리 토큰을 줘요
app.post("/api/admin/login", (req, res) => {
  const result = checkPassword(req.ip || "unknown", req.body?.password);
  if (result === "ok") {
    return res.json({ success: true, ...issueToken() });
  }
  if (result === "not_configured") {
    return res.status(503).json({ success: false, error: "서버에 관리자 비밀번호(ADMIN_PASSWORD)가 설정되지 않았어요." });
  }
  if (result === "locked") {
    return res.status(429).json({ success: false, error: "비밀번호를 여러 번 틀렸어요. 10분 뒤에 다시 시도해 주세요." });
  }
  return res.status(401).json({ success: false, error: "비밀번호가 맞지 않아요." });
});

// Admin configuration endpoints
app.get("/api/admin/config", (_req, res) => {
  res.json({ success: true, config: currentAdminConfig });
});

// 설정 변경은 관리자 토큰이 있어야 해요
app.post("/api/admin/config", requireAdmin, (req, res) => {
  const newConfig = req.body;
  if (newConfig && typeof newConfig === "object") {
    currentAdminConfig = {
      ...currentAdminConfig,
      ...newConfig,
    };
    return res.json({ success: true, config: currentAdminConfig });
  }
  res.status(400).json({ success: false, error: "Invalid config object" });
});

// Chat & Emotional analysis endpoint
app.post("/api/chat", chatRateLimit, async (req, res) => {
  const { text, configOverride } = req.body;

  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Missing text in request body" });
  }

  const cleanText = text.trim();

  // 아주 긴 글로 Gemini 사용료가 늘지 않게 길이를 제한해요 (화면 입력칸은 250자까지)
  if (cleanText.length > MAX_CHAT_CHARS) {
    return res.status(413).json({ error: `메시지는 ${MAX_CHAT_CHARS}자까지 보낼 수 있어요.` });
  }

  // Instant crisis keyword check (< 5ms response, 100% reliable)
  const hasCrisisWords = CRISIS_REGEX.test(cleanText.replace(/\s+/g, ""));
  if (hasCrisisWords) {
    return res.json(analyzeLocally(cleanText));
  }

  // Active config for this request
  // 관리자는 설정 전체를 바꿔 시험할 수 있고, 일반 방문자는 말투와 추론 깊이만 고를 수 있어요
  const isAdmin = isValidToken(tokenFromRequest(req));
  const effectiveConfig: AIAdminConfig = {
    ...currentAdminConfig,
    ...(isAdmin ? configOverride || {} : pickGuestOverride(configOverride)),
  };

  const compiledPrompt = buildCompiledSystemPrompt(effectiveConfig);

  // Map thinking level
  let thinkingConfigLevel = ThinkingLevel.MEDIUM;
  if (effectiveConfig.thinkingLevel === "HIGH") {
    thinkingConfigLevel = ThinkingLevel.HIGH;
  } else if (effectiveConfig.thinkingLevel === "LOW") {
    thinkingConfigLevel = ThinkingLevel.LOW;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const hasValidKey = Boolean(apiKey && apiKey.trim() && apiKey !== "MY_GEMINI_API_KEY");

  // If a valid key exists, attempt Gemini 3.8 Flash (최대 2번, 아래 callGemini 참고)
  if (hasValidKey) {
    try {
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      // Gemini 한 번 부르기: timeoutMs 안에 답이 없으면 GEMINI_TIMEOUT_EXCEEDED 로 실패해요.
      // 진단용으로 실제 응답 시간을 [gemini] 로그에 남겨요. watchMs 가 timeoutMs 보다 길면
      // 화면에는 예비 답을 먼저 보내고, 요청은 watchMs 까지 기다려 "실제로 몇 초 걸리는지"만 기록해요.
      const callGemini = (model: string, level: ThinkingLevel, timeoutMs: number, watchMs = timeoutMs) => {
        const controller = new AbortController();
        const t0 = Date.now();
        const timer = setTimeout(() => controller.abort(), Math.max(timeoutMs, watchMs));
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("GEMINI_TIMEOUT_EXCEEDED")), timeoutMs)
        );
        const generatePromise = ai.models.generateContent({
        model,
        contents: `사용자의 이야기: "${cleanText.replace(/"/g, "'")}"`,
        config: {
          abortSignal: controller.signal,
          systemInstruction: compiledPrompt,
          thinkingConfig: {
            thinkingLevel: level,
          },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              emotion: {
                type: Type.STRING,
                description: "감정 목록에서 가장 일치하는 감정 이름 1개",
              },
              low: {
                type: Type.BOOLEAN,
                description: "감정이 뚜렷하지 않아 가장 가까운 것을 추정한 경우 true",
              },
              others: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "함께 감지되는 보조 감정 최대 2개",
              },
              why: {
                type: Type.STRING,
                description: "이 감정으로 읽어낸 사유 1문장 (해요체/평어)",
              },
              reply: {
                type: Type.STRING,
                description: "사용자에게 전하는 따뜻한 공감 문장 (2문장 이내)",
              },
              fit: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "추천 도서 3권 각각이 어울리는 이유 각 1문장 (책소개와 겹치지 않게)",
              },
              crisis: {
                type: Type.BOOLEAN,
                description: "자해나 극단적 위기 신호 여부",
              },
            },
            required: ["emotion", "low", "others", "why", "reply", "fit", "crisis"],
          },
        },
      });
        generatePromise.then(
          () => console.log(`[gemini] ${model} (thinking=${level}) answered in ${Date.now() - t0}ms`),
          (e: any) =>
            console.warn(
              `[gemini] ${model} (thinking=${level}) failed after ${Date.now() - t0}ms: ${String(e?.message || e).slice(0, 300)}`
            )
        ).finally(() => clearTimeout(timer));
        return Promise.race([generatePromise, timeoutPromise]);
      };

      // 1번째 시도: 기본 모델(GEMINI_MODEL, 기본 gemini-3.8-flash)을 고른 추론 깊이로, 최대 GEMINI_TIMEOUT_MS(기본 7초)
      // 혼잡(503/429)하거나 시간을 넘기면, 대체 모델(GEMINI_FALLBACK_MODELS)로 순서대로 최소(MINIMAL) 추론 시도해요.
      //   기본 대체 순서: gemini-3.5-flash-lite(가장 빠른 안정판) → gemini-3.6-flash(이전 세대 Flash)
      // 모두 합쳐 GEMINI_TOTAL_BUDGET_MS(기본 18초)를 넘지 않게 하고, 그래도 안 되면 아래 예비 규칙으로 답해요.
      // 1번째 모델은 시간을 넘겨도 GEMINI_WATCH_MS(기본 45초)까지 기다려 실제 응답 시간을 로그로 남겨요(진단용).
      const primaryModel = process.env.GEMINI_MODEL || "gemini-3.8-flash";
      const fallbackModels = (process.env.GEMINI_FALLBACK_MODELS || "gemini-3.5-flash-lite,gemini-3.6-flash")
        .split(",")
        .map((s) => s.trim())
        .filter((m) => m && m !== primaryModel);
      const firstTimeout = Number(process.env.GEMINI_TIMEOUT_MS) || 7000;
      const watchMs = Number(process.env.GEMINI_WATCH_MS) || 45000;
      const totalBudget = Number(process.env.GEMINI_TOTAL_BUDGET_MS) || 18000;
      const startedAt = Date.now();
      const isBusy = (msg: string) =>
        /GEMINI_TIMEOUT_EXCEEDED|abort|503|429|UNAVAILABLE|RESOURCE_EXHAUSTED|overloaded|high demand/i.test(msg);

      let response: any;
      let usedModel = primaryModel;
      try {
        response = await callGemini(primaryModel, thinkingConfigLevel, firstTimeout, watchMs);
      } catch (firstErr: any) {
        const firstMsg = String(firstErr?.message || firstErr);
        if (!isBusy(firstMsg)) throw firstErr; // 키 오류 같은 문제는 다른 모델로 바꿔도 같아서 바로 예비 규칙으로
        let lastErr: any = firstErr;
        console.warn(`Gemini ${primaryModel} busy or slow, trying fallback models:`, firstMsg.slice(0, 200));
        for (let i = 0; i < fallbackModels.length && !response; i++) {
          const remaining = totalBudget - (Date.now() - startedAt);
          if (remaining < 3000) break;
          // 대체 모델이 더 남아 있으면 남은 시간을 나눠 쓰고, 마지막 모델은 남은 시간을 다 써요
          const slot = i < fallbackModels.length - 1 ? Math.min(remaining, 6000) : remaining;
          try {
            response = await callGemini(fallbackModels[i], ThinkingLevel.MINIMAL, slot);
            usedModel = fallbackModels[i];
            console.log(`Gemini fallback model ${fallbackModels[i]} answered`);
          } catch (e: any) {
            lastErr = e;
            console.warn(`Gemini fallback ${fallbackModels[i]} failed:`, String(e?.message || e).slice(0, 200));
          }
        }
        if (!response) throw lastErr;
      }
      const rawJson = (response.text ?? "").trim();
      let parsed: any;
      try {
        parsed = JSON.parse(rawJson);
      } catch {
        const match = rawJson.match(/\{[\s\S]*\}/);
        if (match) {
          parsed = JSON.parse(match[0]);
        } else {
          throw new Error("Unable to parse model JSON output");
        }
      }

      // Match emotion from our DB
      let targetEmo = findEmotion(parsed.emotion?.trim());
      let fromAI = true;

      if (!targetEmo) {
        if (Array.isArray(parsed.others)) {
          for (const o of parsed.others) {
            const found = findEmotion(String(o).trim());
            if (found) {
              targetEmo = found;
              fromAI = false;
              break;
            }
          }
        }
      }

      let heuristic: ReturnType<typeof analyzeNuanceHeuristic> | null = null;
      if (!targetEmo) {
        heuristic = analyzeNuanceHeuristic(cleanText);
        targetEmo = heuristic.category;
        fromAI = false;
      }

      const emotionName = targetEmo.name;
      const defaultFits = generateDistinctFits(emotionName);

      const others = (Array.isArray(parsed.others) ? parsed.others : [])
        .filter((n: any) => typeof n === "string" && n.trim() !== emotionName && findEmotion(n.trim()))
        .slice(0, 2);

      const reply =
        fromAI && typeof parsed.reply === "string" && parsed.reply.trim()
          ? parsed.reply.trim()
          : (heuristic ? heuristic.reply : (EMPATHY_SENTENCES[emotionName] || "당신의 소중한 이야기를 들려주셔서 고마워요."));

      // Ensure fit reasons are non-empty and NEVER identical to book.intro
      let fits: string[] = [];
      if (fromAI && Array.isArray(parsed.fit) && parsed.fit.length >= 3) {
        fits = parsed.fit.slice(0, 3).map((f: any, idx: number) => {
          const fitText = typeof f === "string" ? f.trim() : "";
          const bookIntro = targetEmo.books[idx]?.intro?.trim() || "";
          if (!fitText || fitText === bookIntro) {
            return defaultFits[idx];
          }
          return fitText;
        });
      } else {
        fits = defaultFits;
      }

      return res.json({
        emotion: emotionName,
        low: parsed.low === true,
        others,
        why: typeof parsed.why === "string" && parsed.why.trim() ? parsed.why.trim() : `문장 속 [${emotionName}]의 결을 헤아려 준비한 서재입니다.`,
        reply,
        fit: fits,
        crisis: parsed.crisis === true,
        fromAI: true,
        aiModel: usedModel,
        books: targetEmo.books,
      });
    } catch (err: any) {
      console.warn("Gemini call timed out or failed, using heuristic engine:", err?.message || err);
    }
  }

  // Graceful deterministic heuristic engine (Instant, 100% reliable, zero hang)
  return res.json(analyzeLocally(cleanText));
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (!isProd) {
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(port, "0.0.0.0", () => {
    console.log(`마음결 AI 책방 서버가 실행되었습니다: http://localhost:${port}`);
  });
}

startServer();
