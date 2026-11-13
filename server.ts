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
  localGuessEmotion,
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

app.use(express.json());
// Cloud Run 같은 프록시 뒤에서도 접속자 IP(req.ip)를 바르게 읽도록
app.set("trust proxy", true);

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

  // If a valid key exists, attempt Gemini 3.8 Flash with a strict 6-second timeout
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

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("GEMINI_TIMEOUT_EXCEEDED")), 6000)
      );

      const generatePromise = ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: `사용자의 이야기: "${cleanText.replace(/"/g, "'")}"`,
        config: {
          systemInstruction: compiledPrompt,
          thinkingConfig: {
            thinkingLevel: thinkingConfigLevel,
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

      const response: any = await Promise.race([generatePromise, timeoutPromise]);
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

      if (!targetEmo) {
        targetEmo = localGuessEmotion(cleanText);
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
          : EMPATHY_SENTENCES[emotionName] || "당신의 소중한 이야기를 들려주셔서 고마워요.";

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
