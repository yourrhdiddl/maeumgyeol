import React from "react";

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-white/[0.06] bg-[#080A10]/80 backdrop-blur-md px-6 py-4 text-xs text-[#647087]">
      <div className="max-w-6xl mx-auto flex items-center justify-center text-center">
        <p className="leading-relaxed">
          전문 심리 상담이나 진단은 아니에요. 마음이 많이 힘드실 땐{" "}
          <strong className="text-[#9AA5B8] font-medium">자살예방 상담전화 109</strong>(24시간)로 연락해 주세요.
          책 정보는 구매 전에 서점에서 한 번 더 확인해 주세요.
        </p>
      </div>
    </footer>
  );
};
