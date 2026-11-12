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

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;
const isProd = process.env.NODE_ENV === "production";

app.use(express.json());

// In-memory active admin config
let currentAdminConfig: AIAdminConfig = { ...DEFAULT_ADMIN_CONFIG };

// Helper to generate distinct recommendation reasons (completely different from book.intro)
function generateDistinctFits(emotionName: string): string[] {
  return [
    `마음에 ${emotionName}의 파동이 일렁일 때, 내면의 중심을 잡고 깊은 위안을 얻을 수 있는 첫 번째 추천작입니다.`,
    `복잡하게 얽힌 ${emotionName}의 기분을 차분하게 정리하고 다정한 공감과 새로운 시선을 전해줍니다.`,
    `하루의 끝에 지친 마음에 따스한 쉼표를 찍어주며 안도감과 용기를 선사하는 책입니다.`,
  ];
}

// Admin configuration endpoints
app.get("/api/admin/config", (_req, res) => {
  res.json({ success: true, config: currentAdminConfig });
});

app.post("/api/admin/config", (req, res) => {
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
app.post("/api/chat", async (req, res) => {
  const { text, configOverride } = req.body;

  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Missing text in request body" });
  }

  const cleanText = text.trim();

  // Instant crisis keyword check (< 5ms response, 100% reliable)
  const hasCrisisWords = CRISIS_REGEX.test(cleanText.replace(/\s+/g, ""));
  if (hasCrisisWords) {
    const fallbackCategory = localGuessEmotion(cleanText) || EMOTION_DATABASE[0];
    return res.json({
      emotion: fallbackCategory.name,
      low: false,
      others: [],
      why: "많이 지치고 힘든 마음이 깊게 느껴져 먼저 보듬어 드리고 싶어요.",
      reply: "지금 많이 힘드시군요. 혼자 감당하지 않아도 괜찮아요. 아래 안내해 드린 전문 상담 전화(109)로 언제든 따뜻한 도움을 받아보세요.",
      fit: [
        "지친 마음에 잠시 숨을 불어넣어 주는 온기 있는 글입니다.",
        "무거운 마음의 짐을 잠시 내려놓을 수 있는 이야기입니다.",
        "혼자가 아니라는 다정한 위로를 건네는 책입니다.",
      ],
      crisis: true,
      fromAI: false,
      books: fallbackCategory.books,
    });
  }

  // Active config for this request
  const effectiveConfig: AIAdminConfig = {
    ...currentAdminConfig,
    ...(configOverride || {}),
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
  const fallbackCategory = localGuessEmotion(cleanText);
  const emotionName = fallbackCategory.name;
  const distinctFits = generateDistinctFits(emotionName);

  return res.json({
    emotion: emotionName,
    low: true,
    others: [],
    why: `문장 속에서 전해지는 [${emotionName}]의 결을 차분히 읽어내었습니다.`,
    reply: EMPATHY_SENTENCES[emotionName] || "이야기를 들려주셔서 감사해요. 마음에 머물러 줄 책들을 준비했어요.",
    fit: distinctFits,
    crisis: false,
    fromAI: false,
    books: fallbackCategory.books,
  });
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
