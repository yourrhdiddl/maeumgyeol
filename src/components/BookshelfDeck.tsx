import React, { useState } from "react";
import { BookOpen, ShieldAlert, ChevronDown, ChevronUp, Compass, Heart } from "lucide-react";
import { EmotionAnalysisResult } from "../types.ts";

interface BookshelfDeckProps {
  result: EmotionAnalysisResult | null;
  onOpenPicker: () => void;
  isLoading: boolean;
}

export const BookshelfDeck: React.FC<BookshelfDeckProps> = ({
  result,
  onOpenPicker,
  isLoading,
}) => {
  const [showBooksUnderCrisis, setShowBooksUnderCrisis] = useState(false);

  if (!result && !isLoading) {
    return (
      <div className="h-full flex flex-col justify-center items-center p-8 text-center bg-[#090C15]/50 text-[#9AA5B8] space-y-5">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#4E8CFF]/10 via-[#9C6FFF]/10 to-[#E879F9]/10 border border-white/10 flex items-center justify-center text-[#4E8CFF] shadow-inner">
          <BookOpen className="w-7 h-7" />
        </div>
        <div className="space-y-2 max-w-sm">
          <h3 className="text-xl font-semibold tracking-tight text-[#F0F4FC]">
            마음을 담는 맞춤 서재
          </h3>
          <p className="text-xs sm:text-sm leading-relaxed text-[#647087]">
            대화창에 이야기를 건네시면, 당신의 감정 상태를 읽어내어 공명하는 책 3권이 이곳에 펼쳐집니다.
          </p>
        </div>
        <button
          onClick={onOpenPicker}
          className="text-xs sm:text-sm py-2.5 px-5 rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-[#F0F4FC] hover:border-[#4E8CFF]/50 transition-all flex items-center gap-2 cursor-pointer font-medium shadow-sm"
        >
          <Compass className="w-4 h-4 text-[#4E8CFF]" />
          <span>30가지 감정 직접 둘러보기</span>
        </button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6 bg-[#090C15]/40 backdrop-blur-md">
      {/* Top Header */}
      <div className="border-b border-white/[0.06] pb-4 flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-[11px] uppercase tracking-wider text-[#647087] font-semibold block font-mono">
            CURATED BOOKSHELF
          </span>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-semibold text-[#F0F4FC] tracking-tight">
              추천 서재
            </h2>
            {result?.emotion && (
              <span className="px-3 py-0.5 rounded-full bg-[#4E8CFF]/15 border border-[#4E8CFF]/30 text-[#4E8CFF] text-xs font-semibold">
                #{result.crisis ? "마음 돌봄" : result.emotion}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={onOpenPicker}
          className="text-xs text-[#9AA5B8] hover:text-[#F0F4FC] flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-white/[0.06] border border-transparent hover:border-white/10 transition-all cursor-pointer"
          title="다른 감정 선택하기"
        >
          <Compass className="w-3.5 h-3.5 text-[#4E8CFF]" />
          <span>감정 변경</span>
        </button>
      </div>

      {/* Crisis Warning Banner if crisis === true */}
      {result?.crisis && (
        <div className="bg-[#E879F9]/10 border border-[#E879F9]/40 rounded-3xl p-5 sm:p-6 text-[#F0F4FC] space-y-4 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-2.5 text-[#E879F9]">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <h3 className="font-semibold text-base">혼자 견디지 않아도 괜찮아요</h3>
          </div>
          <p className="text-xs sm:text-sm leading-relaxed text-[#F0F4FC]/90">
            지금 많이 힘드시군요. 당신의 소중한 마음에 깊이 공감합니다.
            혼자 감당하기 어려운 고통이 느껴질 땐, 언제든 주저하지 마시고 24시간 열려 있는 전문 상담 창구에 따뜻한 도움을 받아보세요.
          </p>
          <div className="pt-2 border-t border-white/10 flex flex-wrap gap-2 text-xs">
            <span className="bg-white/10 text-[#F0F4FC] px-3 py-1.5 rounded-full font-semibold">
              자살예방 상담전화: 109
            </span>
            <span className="bg-white/10 text-[#F0F4FC] px-3 py-1.5 rounded-full font-semibold">
              정신건강 상담전화: 1577-0199
            </span>
            <span className="bg-white/10 text-[#F0F4FC] px-3 py-1.5 rounded-full">
              긴급 구조: 119
            </span>
          </div>

          <div className="pt-1">
            <button
              onClick={() => setShowBooksUnderCrisis(!showBooksUnderCrisis)}
              className="text-xs text-[#E879F9] hover:underline flex items-center gap-1 cursor-pointer font-medium"
            >
              {showBooksUnderCrisis ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>추천 도서 접기</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>그래도 어울리는 책들을 볼래요</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Basis / Insight banner */}
      {result && (!result.crisis || showBooksUnderCrisis) && (
        <div className="bg-[#0E121E]/80 border border-white/[0.08] rounded-2xl p-4 sm:p-5 text-xs sm:text-sm space-y-2 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-[#4E8CFF] font-medium">
            <Heart className="w-4 h-4" />
            <span>감정 공명 인사이트</span>
          </div>
          <p className="text-[#9AA5B8] leading-relaxed">
            {result.why ? result.why : `마음결이 감지한 [${result.emotion}]의 결에 맞춰 엄선한 도서들입니다.`}
          </p>
          {result.others && result.others.length > 0 && (
            <p className="text-[11px] text-[#647087]">
              함께 엿보인 감정: {result.others.join(", ")}
            </p>
          )}
        </div>
      )}

      {/* Book Cards Stack */}
      {result && (!result.crisis || showBooksUnderCrisis) && (
        <div className="space-y-4">
          {result.books.map((book, idx) => {
            const rawFit = result.fit && result.fit[idx] ? result.fit[idx].trim() : "";
            const bookIntro = book.intro ? book.intro.trim() : "";

            // Guarantee that fitReason is NEVER identical to book.intro
            let fitReason = rawFit;
            if (!fitReason || fitReason === bookIntro) {
              fitReason = `[${result.emotion}]의 마음에 머물며 지친 하루를 차분하게 다독여 주는 ${idx + 1}번째 큐레이션 도서입니다.`;
            }

            return (
              <div
                key={idx}
                className="bg-[#0E121E]/70 border border-white/[0.08] hover:border-white/20 rounded-3xl p-5 sm:p-6 space-y-3.5 transition-all shadow-sm hover:shadow-md group backdrop-blur-sm"
              >
                {/* Book Index & Title */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[11px] font-mono font-semibold text-[#4E8CFF] block">
                      BOOK {String(idx + 1).padStart(2, "0")}
                    </span>
                    <h3 className="text-base sm:text-lg font-semibold text-[#F0F4FC] group-hover:text-gemini-gradient transition-all leading-snug">
                      {book.title}
                    </h3>
                    <p className="text-xs text-[#9AA5B8]">{book.author || "저자 미상"}</p>
                  </div>

                  <span className="text-[10px] font-mono text-[#647087] bg-white/[0.04] px-2.5 py-1 rounded-full border border-white/[0.06] shrink-0">
                    {book.sourceTag}
                  </span>
                </div>

                {/* Personalized Fit / Reason (Distinct from book intro) */}
                <div className="bg-[#4E8CFF]/10 border border-[#4E8CFF]/20 rounded-2xl p-3.5 text-xs sm:text-sm text-[#F0F4FC] leading-relaxed">
                  <span className="text-[#4E8CFF] font-semibold block mb-1">
                    추천 이유
                  </span>
                  <p>{fitReason}</p>
                </div>

                {/* Book Introduction (Distinct from fit) */}
                <div className="text-xs sm:text-sm text-[#9AA5B8] leading-relaxed pt-0.5">
                  <span className="text-[#F0F4FC]/80 font-medium">책 소개 · </span>
                  <span>{book.intro}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Manual Emotion Selector Button */}
      <div className="pt-2">
        <button
          onClick={onOpenPicker}
          className="w-full py-3.5 px-5 rounded-full border border-white/10 hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.06] text-xs sm:text-sm text-[#9AA5B8] hover:text-[#F0F4FC] transition-all flex items-center justify-center gap-2 cursor-pointer font-medium"
        >
          <Compass className="w-4 h-4 text-[#4E8CFF]" />
          <span>내가 원하는 감정을 서재에서 직접 골라보기</span>
        </button>
      </div>
    </div>
  );
};
