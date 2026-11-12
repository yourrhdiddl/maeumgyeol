import React, { useRef, useEffect } from "react";
import { ArrowUp, BookOpen, User, AlertCircle, RotateCcw } from "lucide-react";
import { ChatMessage } from "../types.ts";
import { SUGGESTED_EXAMPLES } from "../data/bookstoreDb.ts";

interface ChatStreamProps {
  messages: ChatMessage[];
  inputText: string;
  setInputText: (val: string) => void;
  onSubmit: (text?: string) => void;
  isLoading: boolean;
  onSelectMessageResult: (msg: ChatMessage) => void;
  selectedMessageId?: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onRetry?: (prompt: string) => void;
}

export const ChatStream: React.FC<ChatStreamProps> = ({
  messages,
  inputText,
  setInputText,
  onSubmit,
  isLoading,
  onSelectMessageResult,
  selectedMessageId,
  inputRef,
  onRetry,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSubmit();
  };

  return (
    <div className="flex flex-col h-full bg-transparent relative">
      {/* Messages Scroll Area with generous padding */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-10 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Welcome State when empty (Gemini style) */}
        {messages.length === 0 && (
          <div className="max-w-xl mx-auto py-8 sm:py-16 space-y-6 sm:space-y-8">
            <div className="space-y-3">
              <h1 className="text-2xl sm:text-4xl font-semibold tracking-tight text-[#F0F4FC]">
                <span className="text-gemini-gradient">안녕하세요,</span>
                <br />
                지금 마음에 어떤 결이 흐르고 있나요?
              </h1>
              <p className="text-xs sm:text-sm text-[#9AA5B8] leading-relaxed pt-1">
                오늘 있었던 일이나 문득 스친 감정을 한 문장으로 편하게 들려주세요.
                당신의 문장을 찬찬히 읽고, 다정한 공감과 함께 어울리는 책 3권을 골라 드립니다.
              </p>
            </div>

            {/* Suggested Prompts Grid */}
            <div className="space-y-3">
              <span className="text-xs uppercase tracking-wider text-[#647087] font-semibold block">
                추천 문장 예시 (클릭하여 전송)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {SUGGESTED_EXAMPLES.map((example, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onSubmit(example)}
                    className="p-3.5 rounded-2xl border border-white/[0.08] bg-[#0E121E]/60 hover:bg-[#161B2E] hover:border-white/20 text-[#F0F4FC] text-left text-xs sm:text-sm leading-relaxed transition-all cursor-pointer group shadow-sm"
                  >
                    <span className="text-[#9AA5B8] group-hover:text-[#F0F4FC] transition-colors">
                      "{example}"
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Message Stream */}
        {messages.map((msg) => {
          const isUser = msg.sender === "user";
          const isSelected = selectedMessageId === msg.id;

          if (isUser) {
            return (
              <div key={msg.id} className="flex justify-end items-end gap-2.5 sm:gap-3">
                <div className="max-w-[88%] sm:max-w-[75%] bg-[#1E2438] border border-white/10 text-[#F0F4FC] px-4 sm:px-5 py-3 sm:py-3.5 rounded-3xl rounded-br-md text-sm sm:text-base leading-relaxed shadow-lg">
                  <p>{msg.text}</p>
                  <span className="text-[10px] text-[#647087] block text-right mt-1.5 font-mono">
                    {msg.timestamp}
                  </span>
                </div>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#161B2E] border border-white/10 flex items-center justify-center shrink-0 text-[#9AA5B8]">
                  <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
            );
          }

          // Error Message State (Issue 14 in test report)
          if (msg.isError) {
            return (
              <div key={msg.id} className="flex justify-start items-start gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0 text-red-400 mt-0.5">
                  <AlertCircle className="w-4 h-4" />
                </div>

                <div className="max-w-[92%] sm:max-w-[85%] bg-[#1A1215] border border-red-500/30 text-[#F0F4FC] p-4 sm:p-5 rounded-3xl rounded-tl-md space-y-3 shadow-md">
                  <p className="text-xs sm:text-sm text-red-200 leading-relaxed">
                    {msg.text}
                  </p>

                  {msg.failedPrompt && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => onRetry && onRetry(msg.failedPrompt!)}
                        className="px-4 py-2 rounded-full bg-gradient-to-r from-[#4E8CFF] to-[#9C6FFF] hover:opacity-90 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>다시 시도하기</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          }

          // AI Message
          return (
            <div
              key={msg.id}
              onClick={() => onSelectMessageResult(msg)}
              className={`flex justify-start items-start gap-2.5 sm:gap-3.5 group cursor-pointer transition-all ${
                isSelected ? "opacity-100" : "opacity-95 hover:opacity-100"
              }`}
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-[#4E8CFF] to-[#9C6FFF] p-[1.5px] shrink-0 mt-1 shadow-md shadow-[#4E8CFF]/10">
                <div className="w-full h-full bg-[#0E121E] rounded-full flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-[#4E8CFF]" />
                </div>
              </div>

              <div className="max-w-[92%] sm:max-w-[85%] bg-[#0E121E]/80 border border-white/[0.08] hover:border-white/20 text-[#F0F4FC] p-4 sm:p-6 rounded-3xl rounded-tl-md space-y-3.5 sm:space-y-4 transition-all shadow-md backdrop-blur-md">
                {/* Emotion Tag Header */}
                {msg.result && (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#9AA5B8]">
                    <span className="px-3 py-1 rounded-full bg-[#4E8CFF]/15 border border-[#4E8CFF]/30 text-[#4E8CFF] font-semibold text-xs">
                      #{msg.result.emotion}
                    </span>
                    {msg.result.others && msg.result.others.length > 0 && (
                      <span className="text-[#647087]">
                        · 곁들인 감정: {msg.result.others.join(", ")}
                      </span>
                    )}
                    <span className="ml-auto text-[11px] text-[#9C6FFF] font-medium flex items-center gap-1 group-hover:underline">
                      <BookOpen className="w-3 h-3" />
                      <span>우측 서재 연동됨</span>
                    </span>
                  </div>
                )}

                {/* AI Reply Prose */}
                <p className="text-base sm:text-lg font-medium leading-relaxed text-[#F0F4FC]">
                  {msg.text}
                </p>

                {/* Why / Basis */}
                {msg.result?.why && (
                  <div className="text-xs sm:text-sm text-[#9AA5B8] bg-[#161B2E]/70 p-3 sm:p-3.5 rounded-2xl border border-white/[0.06] leading-relaxed">
                    <span className="text-[#4E8CFF] font-medium">마음결 노트: </span>
                    {msg.result.why}
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-[#647087] pt-1">
                  <span>우측 서재에서 맞춤 추천 도서 3권을 확인하세요</span>
                  <span className="font-mono">{msg.timestamp}</span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-start gap-2.5 sm:gap-3.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-[#4E8CFF] to-[#9C6FFF] p-[1.5px] shrink-0 animate-pulse">
              <div className="w-full h-full bg-[#0E121E] rounded-full flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-[#4E8CFF]" />
              </div>
            </div>
            <div className="bg-[#0E121E]/80 border border-white/[0.08] px-4 sm:px-5 py-3 sm:py-4 rounded-3xl rounded-tl-md flex items-center gap-3 text-sm text-[#9AA5B8] shadow-sm">
              <div className="flex gap-1.5 items-center">
                <span className="w-2 h-2 rounded-full bg-[#4E8CFF] animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-2 h-2 rounded-full bg-[#9C6FFF] animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-2 h-2 rounded-full bg-[#E879F9] animate-bounce"></span>
              </div>
              <span className="text-xs text-[#9AA5B8]">문장의 결을 찬찬히 읽고 있어요...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Floating Gemini-style Input Bar */}
      <div className="p-3 sm:p-6 bg-gradient-to-t from-[#080A10] via-[#080A10]/90 to-transparent">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="relative flex items-center bg-[#131726] border border-white/[0.12] focus-within:border-[#4E8CFF] focus-within:ring-2 focus-within:ring-[#4E8CFF]/20 rounded-full px-4 sm:px-5 py-1.5 sm:py-2 shadow-2xl transition-all">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isLoading}
              placeholder="지금 마음이나 상황을 한 문장으로 편하게 들려주세요..."
              maxLength={250}
              className="flex-1 bg-transparent py-2.5 text-xs sm:text-base text-[#F0F4FC] placeholder:text-[#647087] focus:outline-none"
            />
            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-[#4E8CFF] to-[#9C6FFF] hover:opacity-90 disabled:opacity-20 disabled:cursor-not-allowed text-white flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-md shadow-[#4E8CFF]/30 ml-2"
              title="보내기"
              aria-label="문장 보내기"
            >
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
