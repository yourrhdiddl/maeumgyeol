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
  TonePresetKey,
} from "./data/adminConfig.ts";
import {
  EmotionCategory,
  EMPATHY_SENTENCES,
} from "./data/bookstoreDb.ts";

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
  const [adminUser, setAdminUser] = useState<{ email: string; name: string } | null>(null);

  // Admin Config state (persisted in localStorage)
  const [adminConfig, setAdminConfig] = useState<AIAdminConfig>(() => {
    try {
      const saved = localStorage.getItem("maumgyeol_admin_config");
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_ADMIN_CONFIG;
  });

  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch initial server config once
  useEffect(() => {
    fetch("/api/admin/config")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.config) {
          if (!localStorage.getItem("maumgyeol_admin_config")) {
            setAdminConfig(data.config);
          }
        }
      })
      .catch(() => {
        // use local defaults
      });
  }, []);

  // Keyboard shortcut listener: Ctrl/Cmd + Shift + A to open Admin Google Auth or Drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        if (adminUser) {
          setIsAdminOpen((prev) => !prev);
        } else {
          setIsAuthOpen(true);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [adminUser]);

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
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          text: textToSend,
          configOverride: adminConfig,
        }),
      });
      clearTimeout(timeoutId);

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
      await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newConfig),
      });
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

  const handleAuthSuccess = (user: { email: string; name: string }) => {
    setAdminUser(user);
    setIsAuthOpen(false);
    setIsAdminOpen(true);
  };

  const handleAdminLogout = () => {
    setAdminUser(null);
    setIsAdminOpen(false);
  };

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
      />

      {/* Admin Authentication Modal (Google Login: yourrhdiddl@gmail.com) */}
      <AdminAuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Admin Prompt & AI Parameter Tuning Drawer */}
      <AdminTuningDrawer
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        config={adminConfig}
        onSaveConfig={handleSaveAdminConfig}
        adminEmail={adminUser?.email}
        onLogout={handleAdminLogout}
      />
    </div>
  );
}
