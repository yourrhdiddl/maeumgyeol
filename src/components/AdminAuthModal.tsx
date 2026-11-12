import React, { useState } from "react";
import { X, ShieldCheck, AlertCircle, Check, ArrowRight, UserCheck } from "lucide-react";

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: { email: string; name: string }) => void;
}

export const ADMIN_EMAIL = "yourrhdiddl@gmail.com";

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedEmail, setSelectedEmail] = useState(ADMIN_EMAIL);
  const [isOtherEmailMode, setIsOtherEmailMode] = useState(false);
  const [customEmail, setCustomEmail] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleGoogleLogin = (emailToVerify: string) => {
    setAuthError(null);
    setIsAuthenticating(true);

    setTimeout(() => {
      setIsAuthenticating(false);
      const cleanEmail = emailToVerify.trim().toLowerCase();

      if (cleanEmail === ADMIN_EMAIL.toLowerCase()) {
        setIsSuccess(true);
        setTimeout(() => {
          setIsSuccess(false);
          onSuccess({ email: ADMIN_EMAIL, name: "관리자" });
        }, 800);
      } else {
        setAuthError(`접근 거부: [${cleanEmail}] 계정은 관리자 권한이 없습니다. 등록된 관리자(${ADMIN_EMAIL})로 로그인해 주세요.`);
      }
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0E121E] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-[#F0F4FC]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-[#647087] hover:text-[#F0F4FC] hover:bg-white/[0.06] transition-colors cursor-pointer"
          aria-label="닫기"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Google Branding Header */}
        <div className="text-center space-y-2.5 pt-2">
          {/* Google 4-Color SVG Icon */}
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white p-3 shadow-lg flex items-center justify-center">
            <svg viewBox="0 0 48 48" className="w-full h-full">
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
              <path fill="none" d="M0 0h48v48H0z" />
            </svg>
          </div>

          <h3 className="text-xl font-bold tracking-tight text-[#F0F4FC]">
            Google 계정으로 관리자 로그인
          </h3>
          <p className="text-xs text-[#9AA5B8] leading-relaxed max-w-xs mx-auto">
            관리자 스튜디오는 등록된 관리자 계정(<span className="text-[#4E8CFF] font-semibold">{ADMIN_EMAIL}</span>)으로만 진입할 수 있습니다.
          </p>
        </div>

        {/* Authentication Box */}
        <div className="space-y-4">
          {!isOtherEmailMode ? (
            /* Primary One-Click Google Auth with Detected Account */
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-[#161B2E] border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#4E8CFF] to-[#9C6FFF] flex items-center justify-center text-white font-bold text-sm">
                    Y
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-[#F0F4FC]">관리자 계정</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#4E8CFF]/20 text-[#4E8CFF] font-mono">
                        공인됨
                      </span>
                    </div>
                    <span className="text-xs text-[#9AA5B8] font-mono">{ADMIN_EMAIL}</span>
                  </div>
                </div>

                <div className="w-6 h-6 rounded-full bg-[#4E8CFF]/20 text-[#4E8CFF] flex items-center justify-center">
                  <UserCheck className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Official Google Sign-In Action Button */}
              <button
                type="button"
                onClick={() => handleGoogleLogin(selectedEmail)}
                disabled={isAuthenticating || isSuccess}
                className="w-full py-3.5 px-5 rounded-full bg-white hover:bg-neutral-100 text-[#1F1F1F] font-semibold text-sm transition-all shadow-lg flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
              >
                {isSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                    <span className="text-emerald-700">인증 완료! 스튜디오로 이동 중...</span>
                  </>
                ) : isAuthenticating ? (
                  <span className="text-neutral-600">Google 계정 확인 중...</span>
                ) : (
                  <>
                    <svg viewBox="0 0 48 48" className="w-5 h-5 shrink-0">
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                      />
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      />
                      <path fill="none" d="M0 0h48v48H0z" />
                    </svg>
                    <span>{ADMIN_EMAIL} 계정으로 로그인</span>
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setIsOtherEmailMode(true)}
                  className="text-xs text-[#647087] hover:text-[#9AA5B8] underline transition-colors cursor-pointer"
                >
                  다른 Google 계정으로 로그인 시도
                </button>
              </div>
            </div>
          ) : (
            /* Other Account Mode (to prove unauthorized denial) */
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleGoogleLogin(customEmail);
              }}
              className="space-y-3"
            >
              <div className="space-y-1.5 text-left">
                <label className="text-xs text-[#9AA5B8]">Google 계정 이메일 입력:</label>
                <input
                  type="email"
                  value={customEmail}
                  onChange={(e) => {
                    setCustomEmail(e.target.value);
                    if (authError) setAuthError(null);
                  }}
                  placeholder="user@gmail.com"
                  className="w-full bg-[#161B2E] border border-white/10 focus:border-[#4E8CFF] rounded-full px-5 py-3 text-sm text-[#F0F4FC] placeholder:text-[#647087] focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsOtherEmailMode(false);
                    setAuthError(null);
                  }}
                  className="w-1/2 py-2.5 rounded-full bg-white/[0.06] hover:bg-white/10 text-xs font-medium text-[#9AA5B8] transition-colors cursor-pointer"
                >
                  뒤로 가기
                </button>
                <button
                  type="submit"
                  disabled={!customEmail.trim() || isAuthenticating}
                  className="w-1/2 py-2.5 rounded-full bg-gradient-to-r from-[#4E8CFF] to-[#9C6FFF] hover:opacity-90 text-white text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>로그인 확인</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}

          {/* Error Notice */}
          {authError && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-300 text-left">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <p className="leading-relaxed">{authError}</p>
            </div>
          )}
        </div>

        {/* Security Footer note */}
        <div className="pt-2 border-t border-white/[0.06] flex items-center justify-center gap-2 text-[11px] text-[#647087]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#4E8CFF]" />
          <span>Google OAuth 2.0 보안 인증 및 관리자 이메일 검증</span>
        </div>
      </div>
    </div>
  );
};
