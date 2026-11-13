import React from "react";
import { X, Check, BrainCircuit, HeartHandshake } from "lucide-react";
import { TONE_PRESETS, TonePresetKey } from "../data/adminConfig.ts";

interface GuestModelSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeToneKey: TonePresetKey;
  onChangeTone: (tone: TonePresetKey) => void;
  thinkingLevel: "LOW" | "MEDIUM" | "HIGH";
  onChangeThinking: (level: "LOW" | "MEDIUM" | "HIGH") => void;
  /** false면 서버 없이 배포된 사이트(GitHub Pages): 말투·추론 깊이가 답변에 반영되지 않음 */
  aiAvailable?: boolean;
}

export const GuestModelSelectorModal: React.FC<GuestModelSelectorModalProps> = ({
  isOpen,
  onClose,
  activeToneKey,
  onChangeTone,
  thinkingLevel,
  onChangeThinking,
  aiAvailable = true,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0E121E] border border-white/10 w-full max-w-lg rounded-3xl shadow-2xl flex flex-col overflow-hidden text-[#F0F4FC]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-white/[0.06] flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold tracking-tight text-[#F0F4FC]">
              AI 책방지기 & 모델 설정
            </h3>
            <p className="text-xs text-[#9AA5B8]">
              원하시는 대화 어조와 AI 추론 깊이를 자유롭게 선택해 보세요.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-[#647087] hover:text-[#F0F4FC] hover:bg-white/[0.06] transition-colors cursor-pointer"
            aria-label="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {!aiAvailable && (
            <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-xs leading-relaxed text-amber-200">
              지금은 AI 서버에 연결되지 않아 문장 속 낱말로 감정을 읽어요. 그래서 여기서 고른 말투와 추론 깊이는 지금 답변에
              반영되지 않아요.
            </div>
          )}
          {/* Section 1: Tone Presets */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#9AA5B8]">
              <HeartHandshake className="w-4 h-4 text-[#4E8CFF]" />
              <span>공감 말투 페르소나</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(Object.keys(TONE_PRESETS) as TonePresetKey[]).map((key) => {
                const preset = TONE_PRESETS[key];
                const isSelected = activeToneKey === key;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onChangeTone(key)}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer space-y-1.5 ${
                      isSelected
                        ? "bg-[#161B2E] border-[#4E8CFF] ring-2 ring-[#4E8CFF]/20 shadow-md"
                        : "bg-[#121624] border-white/[0.08] hover:border-white/20 hover:bg-[#161B2E]/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs sm:text-sm text-[#F0F4FC]">
                        {preset.label}
                      </span>
                      {isSelected ? (
                        <div className="w-4 h-4 rounded-full bg-[#4E8CFF] flex items-center justify-center text-white shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      ) : (
                        <span className="text-[10px] text-[#647087] font-mono">
                          {preset.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#9AA5B8] leading-relaxed">
                      {preset.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Thinking Level */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#9AA5B8]">
              <BrainCircuit className="w-4 h-4 text-[#9C6FFF]" />
              <span>Gemini 추론 깊이 (Thinking Level)</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { key: "LOW", label: "빠른 응답", desc: "신속하고 간결한 답변" },
                { key: "MEDIUM", label: "보통 (권장)", desc: "균형 잡힌 감정 독해" },
                { key: "HIGH", label: "깊은 사색", desc: "심층적인 맥락 파악" },
              ].map((item) => {
                const isSelected = thinkingLevel === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onChangeThinking(item.key as any)}
                    className={`py-3 px-2 rounded-2xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? "bg-gradient-to-tr from-[#4E8CFF]/20 to-[#9C6FFF]/20 border-[#4E8CFF] text-[#4E8CFF] font-semibold"
                        : "bg-[#121624] border-white/[0.08] text-[#9AA5B8] hover:border-white/20 hover:text-[#F0F4FC]"
                    }`}
                  >
                    <span className="text-xs font-semibold block">{item.label}</span>
                    <span className="text-[10px] text-[#647087] block mt-0.5">
                      {item.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/[0.06] bg-[#0E121E] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#4E8CFF] to-[#9C6FFF] hover:opacity-90 text-white text-xs font-semibold shadow-md shadow-[#4E8CFF]/20 cursor-pointer"
          >
            적용 완료
          </button>
        </div>
      </div>
    </div>
  );
};
