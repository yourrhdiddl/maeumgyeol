import React, { useState } from "react";
import { X, Search, Compass, Sparkles } from "lucide-react";
import { EMOTION_DATABASE, EmotionCategory } from "../data/bookstoreDb.ts";

interface EmotionPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmotion: (emotion: EmotionCategory) => void;
  selectedEmotionName?: string;
}

export const EmotionPickerModal: React.FC<EmotionPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectEmotion,
  selectedEmotionName,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  if (!isOpen) return null;

  const filteredEmotions = EMOTION_DATABASE.filter(
    (e) =>
      e.name.includes(searchTerm) ||
      e.keywords.some((k) => k.includes(searchTerm)) ||
      e.books.some((b) => b.title.includes(searchTerm) || b.author.includes(searchTerm))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0E121E] border border-white/10 w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-[#F0F4FC]">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#4E8CFF]/10 flex items-center justify-center text-[#4E8CFF]">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-[#F0F4FC]">
                30가지 감정의 결 살펴보기
              </h3>
              <p className="text-xs text-[#9AA5B8]">
                원하시는 감정을 선택하시면 해당 감정에 맞춘 책 3권이 즉시 서재에 배치됩니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-[#647087] hover:text-[#F0F4FC] hover:bg-white/[0.06] transition-colors cursor-pointer"
            aria-label="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 sm:p-5 border-b border-white/[0.06] bg-[#161B2E]/40">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#647087]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="감정명, 키워드, 책 제목, 저자로 검색 (예: 불안, 야근, 헤세)"
              className="w-full bg-[#161B2E] border border-white/10 focus:border-[#4E8CFF] focus:ring-2 focus:ring-[#4E8CFF]/20 rounded-full pl-11 pr-5 py-3 text-sm text-[#F0F4FC] placeholder:text-[#647087] focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Emotion Chips Grid */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            {filteredEmotions.map((e) => {
              const isSelected = selectedEmotionName === e.name;
              return (
                <button
                  key={e.name}
                  onClick={() => {
                    onSelectEmotion(e);
                    onClose();
                  }}
                  className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 cursor-pointer border ${
                    isSelected
                      ? "bg-gradient-to-r from-[#4E8CFF] to-[#9C6FFF] border-transparent text-white font-semibold shadow-md shadow-[#4E8CFF]/25"
                      : "bg-[#161B2E]/70 border-white/[0.08] text-[#F0F4FC] hover:border-white/20 hover:bg-[#1E2438]"
                  }`}
                >
                  {e.isPositive && (
                    <Sparkles className="w-3 h-3 text-[#E879F9] shrink-0" />
                  )}
                  <span>{e.name}</span>
                  <span className="text-[10px] text-[#647087] font-mono">
                    {e.books.length}
                  </span>
                </button>
              );
            })}
          </div>

          {filteredEmotions.length === 0 && (
            <div className="py-12 text-center text-sm text-[#647087]">
              일치하는 감정 카테고리를 찾지 못했습니다.
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/[0.06] bg-[#0E121E] text-xs text-[#647087] flex justify-between items-center">
          <span>총 30개 감정 카테고리</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-white/[0.06] hover:bg-white/10 text-[#F0F4FC] text-xs font-medium cursor-pointer transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
