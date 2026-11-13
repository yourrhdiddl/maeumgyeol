import { useState, useEffect, useRef } from "react";
import { Header } from "./components/Header.tsx";
import { ChatStream } from "./components/ChatStream.tsx";
import { BookshelfDeck } from "./components/BookshelfDeck.tsx";
import { EmotionPickerModal } from "./components/EmotionPickerModal.tsx";
import { GuestModelSelectorModal } from "./components/GuestModelSelectorModal.tsx";
import { AdminAuthModal } from "./components/AdminAuthModal.tsx";
import { AdminTuningDrawer } from "./components/AdminTuningDrawer.tsx";
import { Footer } from "./components/Footer.tsx";
import { ChatMessage, EmotionAnalysisResult } from "./types.ts";
import {
  AIAdminConfig,
  DEFAULT_ADMIN_CONFIG,
  DEFAULT_PROMPT_SECTIONS,
  TonePresetKey,
} from "./data/adminConfig.ts";
import {
  EmotionCategory,
  EMPATHY_SENTENCES,
} from "./data/bookstoreDb.ts";
import { analyzeLocally, isNoServerResponse } from "./data/localAnalysis.ts";
import { apiUrl } from "./api.ts";

// 서버(/api)가 없는 곳(예: GitHub Pages)에서 보낸 요청인지 표시하는 오류
class NoServerError extends Error {}
// 서버가 사용량 제한(429)으로 거절했음을 표시하는 오류
class RateLimitedError extends Error {}

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeResult, setActiveResult] = useState<EmotionAnalysisResult | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | undefined>();

  // Modals state
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isGuestModelSelectorOpen, setIsGuestModelSelectorOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  // 관리자 로그인 상태: 서버가 준 토큰. 새로고침해도 이 탭에서는 유지(sessionStorage), 만료되면 버려요
  const [adminSession, setAdminSession] = useState<{ token: string; expiresAt: number } | null>(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem("maumgyeol_admin_session") || "null");
      if (saved?.token && saved.expiresAt > Date.now()) return saved;
    } catch {
      // ignore
    }
    return null;
  });
  const adminAuthHeader: Record<string, string> = adminSession ? { Authorization: `Bearer ${adminSession.token}` } : {};

  // Admin Config state (persisted in localStorage)
  const [adminConfig, setAdminConfig] = useState<AIAdminConfig>(() => {
    try {
      const saved = localStorage.getItem("maumgyeol_admin_config");
      if (saved) {
        const parsed = JSON.parse(saved);
        // 예전에 저장된 설정이면 새 감정 분석 규칙([규칙 1]~[규칙 4])으로 올려 줘요
        if (
          !parsed.promptSections?.emotionClassification ||
          !parsed.promptSections.emotionClassification.includes("[규칙 1")
        ) {
          parsed.promptSections = {
            ...DEFAULT_PROMPT_SECTIONS,
            ...(parsed.promptSections || {}),
            emotionClassification: DEFAULT_PROMPT_SECTIONS.emotionClassification,
          };
        }
        return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_ADMIN_CONFIG;
  });

  const inputRef = useRef<HTMLInputElement>(null);

  // 서버(/api)가 있는지: null = 확인 중, false = GitHub Pages처럼 서버 없이 배포됨(AI 사용 불가)
  const [hasServer, setHasServer] = useState<boolean | null>(null);

  // Fetch initial server config once
  useEffect(() => {
    fetch(apiUrl("/api/admin/config"))
      .then((res) => {
        if (isNoServerResponse(res)) {
          setHasServer(false);
          return { success: false } as { success: boolean; config?: AIAdminConfig };
        }
        setHasServer(true);
        return res.json();
      })
      .then((data) => {
        if (data.success && data.config) {
          if (!localStorage.getItem("maumgyeol_admin_config")) {
            setAdminConfig(data.config);
          }
        }
      })
      .catch(() => {
        // use local defaults
        setHasServer(false);
      });
  }, []);

  // Keyboard shortcut listener: Ctrl/Cmd + Shift + A to open Admin Google Auth or Drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        if (adminSession && adminSession.expiresAt > Date.now()) {
          setIsAdminOpen((prev) => !prev);
        } else {
          setIsAuthOpen(true);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [adminSession]);

  const handleSendMessage = async (textOverride?: string) => {
    const textToSend = (textOverride || inputText).trim();
    if (!textToSend || isLoading) return;

    const userMsgId = `user_${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(apiUrl("/api/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...adminAuthHeader },
        signal: controller.signal,
        body: JSON.stringify({
          text: textToSend,
          configOverride: adminConfig,
        }),
      });
      clearTimeout(timeoutId);

      // 404/405 또는 JSON이 아닌 응답이면 서버가 없는 정적 호스팅이에요
      if (isNoServerResponse(response)) {
        throw new NoServerError(`No API server (${response.status})`);
      }
      // 사용량 제한(429)에 걸리면 이번 한 번은 브라우저 낱말 분석으로 대신해요
      if (response.status === 429) {
        throw new RateLimitedError("Rate limited");
      }
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data: EmotionAnalysisResult = await response.json();

      const aiMsgId = `ai_${Date.now()}`;
      const aiMsg: ChatMessage = {
        id: aiMsgId,
        sender: "ai",
        text: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        result: data,
      };

      setMessages((prev) => [...prev, aiMsg]);
      setActiveResult(data);
      setSelectedMessageId(aiMsgId);
    } catch (err: any) {
      clearTimeout(timeoutId);

      // 서버가 없거나(GitHub Pages) 서버에 연결하지 못하면(네트워크·CORS 오류는 TypeError),
      // 또는 사용량 제한에 걸리면: 브라우저에서 문장 속 낱말로 감정을 읽어 바로 보여 줘요
      const serverMissing = err instanceof NoServerError || err instanceof TypeError;
      if (serverMissing || err instanceof RateLimitedError) {
        if (serverMissing) setHasServer(false);
        const data = analyzeLocally(textToSend);
        const localMsgId = `local_${Date.now()}`;
        setMessages((prev) => [
          ...prev,
          {
            id: localMsgId,
            sender: "ai",
            text: data.reply,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            result: data,
          },
        ]);
        setActiveResult(data);
        setSelectedMessageId(localMsgId);
        return;
      }

      console.error("Chat error:", err);

      const isTimeout = err?.name === "AbortError";
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        sender: "ai",
        text: isTimeout
          ? "응답 대기 시간(10초)이 초과되었어요. 아래 [다시 시도] 버튼을 누르거나 잠시 후 다시 전송해 주세요."
          : "답변을 가져오는 도중 통신 지연이 발생했어요. 아래 [다시 시도] 버튼을 눌러 다시 시도해 주세요.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isError: true,
        failedPrompt: textToSend,
      };
      setMessages((prev) => [...prev, errorMsg]);
      setInputText(textToSend); // preserve input so user doesn't lose text
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectMessageResult = (msg: ChatMessage) => {
    if (msg.result) {
      setActiveResult(msg.result);
      setSelectedMessageId(msg.id);
    }
  };

  const handleSelectEmotionManual = (category: EmotionCategory) => {
    const result: EmotionAnalysisResult = {
      emotion: category.name,
      low: false,
      others: [],
      why: "서재에서 직접 마음에 닿는 감정을 고르셨습니다.",
      reply:
        EMPATHY_SENTENCES[category.name] ||
        `당신이 고른 [${category.name}]의 마음에 머무는 책들을 준비했어요.`,
      fit: category.books.map((b) => b.intro),
      crisis: false,
      fromAI: false,
      books: category.books,
    };

    const manualMsgId = `manual_${Date.now()}`;
    const manualMsg: ChatMessage = {
      id: manualMsgId,
      sender: "ai",
      text: result.reply,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      result,
    };

    setMessages((prev) => [...prev, manualMsg]);
    setActiveResult(result);
    setSelectedMessageId(manualMsgId);
  };

  const handleResetChat = () => {
    if (confirm("대화 내용을 비우고 새로운 마음으로 시작하시겠습니까?")) {
      setMessages([]);
      setActiveResult(null);
      setSelectedMessageId(undefined);
    }
  };

  const handleSaveAdminConfig = async (newConfig: AIAdminConfig) => {
    setAdminConfig(newConfig);
    try {
      localStorage.setItem("maumgyeol_admin_config", JSON.stringify(newConfig));
      if (hasServer === false) return; // 서버가 없으면 이 브라우저에만 저장
      const res = await fetch(apiUrl("/api/admin/config"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...adminAuthHeader },
        body: JSON.stringify(newConfig),
      });
      if (res.status === 401) {
        handleAdminLogout();
        alert("관리자 로그인이 만료되어 서버에 저장하지 못했어요. 다시 로그인한 뒤 저장해 주세요.");
      }
    } catch (err) {
      console.error("Failed to save config:", err);
    }
  };

  const handleGuestChangeTone = (tone: TonePresetKey) => {
    const updated = { ...adminConfig, activeToneKey: tone };
    setAdminConfig(updated);
    localStorage.setItem("maumgyeol_admin_config", JSON.stringify(updated));
  };

  const handleGuestChangeThinking = (level: "LOW" | "MEDIUM" | "HIGH") => {
    const updated = { ...adminConfig, thinkingLevel: level };
    setAdminConfig(updated);
    localStorage.setItem("maumgyeol_admin_config", JSON.stringify(updated));
  };

  const handleAuthSuccess = (session: { token: string; expiresAt: number }) => {
    setAdminSession(session);
    try {
      sessionStorage.setItem("maumgyeol_admin_session", JSON.stringify(session));
    } catch {
      // ignore
    }
    setIsAuthOpen(false);
    setIsAdminOpen(true);
  };

  function handleAdminLogout() {
    setAdminSession(null);
    try {
      sessionStorage.removeItem("maumgyeol_admin_session");
    } catch {
      // ignore
    }
    setIsAdminOpen(false);
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-transparent text-[#F0F4FC] overflow-hidden select-text">
      {/* Top Header */}
      <Header
        onOpenPicker={() => setIsPickerOpen(true)}
        onResetChat={handleResetChat}
        onFocusInput={() => inputRef.current?.focus()}
        chatCount={messages.length}
        activeToneKey={adminConfig.activeToneKey}
        thinkingLevel={adminConfig.thinkingLevel}
        onOpenModelSelector={() => setIsGuestModelSelectorOpen(true)}
      />

      {/* Main 2-Column Split Body */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden min-h-0">
        {/* Left Column: Conversational Chat Stream */}
        <section className="lg:col-span-7 h-full overflow-hidden flex flex-col border-b lg:border-b-0 lg:border-r border-white/[0.06]">
          <ChatStream
            messages={messages}
            inputText={inputText}
            setInputText={setInputText}
            onSubmit={handleSendMessage}
            isLoading={isLoading}
            onSelectMessageResult={handleSelectMessageResult}
            selectedMessageId={selectedMessageId}
            inputRef={inputRef}
            onRetry={handleSendMessage}
          />
        </section>

        {/* Right Column: Curated Bookshelf & Emotion Resonance Deck */}
        <section className="lg:col-span-5 h-full overflow-hidden flex flex-col">
          <BookshelfDeck
            result={activeResult}
            onOpenPicker={() => setIsPickerOpen(true)}
            isLoading={isLoading}
          />
        </section>
      </main>

      {/* Bottom Footer (Medical disclaimer only, no admin button) */}
      <Footer />

      {/* Manual Emotion Selection Modal */}
      <EmotionPickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelectEmotion={handleSelectEmotionManual}
        selectedEmotionName={activeResult?.emotion}
      />

      {/* Guest Model & Empathy Tone Selector Modal */}
      <GuestModelSelectorModal
        isOpen={isGuestModelSelectorOpen}
        onClose={() => setIsGuestModelSelectorOpen(false)}
        activeToneKey={adminConfig.activeToneKey}
        onChangeTone={handleGuestChangeTone}
        thinkingLevel={adminConfig.thinkingLevel}
        onChangeThinking={handleGuestChangeThinking}
        aiAvailable={hasServer !== false}
      />

      {/* Admin Authentication Modal (비밀번호는 서버의 ADMIN_PASSWORD로 확인) */}
      <AdminAuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleAuthSuccess}
        serverAvailable={hasServer !== false}
      />

      {/* Admin Prompt & AI Parameter Tuning Drawer */}
      <AdminTuningDrawer
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        config={adminConfig}
        onSaveConfig={handleSaveAdminConfig}
        adminEmail={adminSession ? "관리자" : undefined}
        adminToken={adminSession?.token}
        onLogout={handleAdminLogout}
        aiAvailable={hasServer !== false}
      />
    </div>
  );
}
