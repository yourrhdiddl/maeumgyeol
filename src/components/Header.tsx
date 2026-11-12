import React from "react";
import { BookOpen, RefreshCw, Compass, ChevronDown } from "lucide-react";
import { TonePresetKey, TONE_PRESETS } from "../data/adminConfig.ts";

interface HeaderProps {
  onOpenPicker: () => void;
  onResetChat: () => void;
  onFocusInput: () => void;
  chatCount: number;
  activeToneKey: TonePresetKey;
  thinkingLevel: "LOW" | "MEDIUM" | "HIGH";
  onOpenModelSelector: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenPicker,
  onResetChat,
  onFocusInput,
  chatCount,
  activeToneKey,
  thinkingLevel,
  onOpenModelSelector,
}) => {
  const currentTone = TONE_PRESETS[activeToneKey] || TONE_PRESETS.warm_keeper;

  const thinkingLabel =
    thinkingLevel === "LOW" ? "빠름" : thinkingLevel === "HIGH" ? "사색" : "보통";

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#080A10]/90 backdrop-blur-xl px-3 sm:px-6 py-2.5 sm:py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Zone - Strictly whitespace-nowrap and shrink-0 to prevent mobile character breaks */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <a
            href="/"
            className="flex items-center gap-2 whitespace-nowrap shrink-0 group text-[#F0F4FC] hover:opacity-90 transition-opacity"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-[#4E8CFF] via-[#9C6FFF] to-[#E879F9] p-[1.5px] flex items-center justify-center shadow-md shadow-[#4E8CFF]/20 shrink-0">
              <div className="w-full h-full bg-[#0E121E] rounded-full flex items-center justify-center">
                <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#4E8CFF]" />
              </div>
            </div>
            {/* Logo text: whitespace-nowrap guaranteed, never breaks vertically on 375px */}
            <span className="font-bold text-gemini-gradient tracking-tight whitespace-nowrap text-base sm:text-lg">
              마음결 AI 책방
            </span>
          </a>

          {/* Guest Persona & Model Selector Pill */}
          <button
            onClick={onOpenModelSelector}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/20 text-[11px] sm:text-xs text-[#9AA5B8] hover:text-[#F0F4FC] transition-all cursor-pointer font-medium shadow-sm whitespace-nowrap shrink-0"
            title="AI 공감 말투 및 모델 추론 깊이 변경"
          >
            <span className="text-[#4E8CFF] font-semibold hidden md:inline">
              {currentTone.label}
            </span>
            <span className="text-[#4E8CFF] font-semibold md:hidden">
              {currentTone.badge}
            </span>
            <span className="text-[#647087]">· {thinkingLabel}</span>
            <ChevronDown className="w-3 h-3 text-[#647087]" />
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <button
            onClick={onOpenPicker}
            className="flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/20 text-xs text-[#9AA5B8] hover:text-[#F0F4FC] transition-all cursor-pointer font-medium whitespace-nowrap"
            title="30가지 감정 둘러보기"
          >
            <Compass className="w-3.5 h-3.5 text-[#4E8CFF]" />
            <span className="hidden sm:inline">30가지 감정</span>
            <span className="sm:hidden text-[11px]">감정</span>
          </button>

          {chatCount > 0 && (
            <button
              onClick={onResetChat}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full border border-white/[0.06] bg-transparent hover:bg-white/[0.06] text-xs text-[#647087] hover:text-[#F0F4FC] transition-all cursor-pointer whitespace-nowrap"
              title="대화 비우기"
            >
              <RefreshCw className="w-3 h-3" />
              <span className="hidden sm:inline">비우기</span>
            </button>
          )}

          <button
            onClick={onFocusInput}
            className="px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold text-white bg-gradient-to-r from-[#4E8CFF] to-[#9C6FFF] hover:from-[#3d7be8] hover:to-[#8b5be8] rounded-full transition-all shadow-md shadow-[#4E8CFF]/20 cursor-pointer whitespace-nowrap shrink-0"
          >
            대화하기
          </button>
        </div>
      </div>
    </header>
  );
};
