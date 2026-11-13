import React, { useState } from "react";
import { X, ShieldCheck, AlertCircle, Check, Lock } from "lucide-react";

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** 로그인 성공 시 서버가 준 관리자 토큰을 넘겨요 */
  onSuccess: (session: { token: string; expiresAt: number }) => void;
  /** false면 서버가 없는 사이트(GitHub Pages)라 로그인할 수 없어요 */
  serverAvailable?: boolean;
}

// 관리자 로그인: 비밀번호를 서버(/api/admin/login)로 보내 확인받아요.
// 비밀번호는 서버 환경변수 ADMIN_PASSWORD 에만 있고, 이 화면 코드에는 들어 있지 않아요.
export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  serverAvailable = true,
}) => {
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const close = () => {
    setPassword("");
    setAuthError(null);
    onClose();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || isAuthenticating) return;
    setAuthError(null);
    setIsAuthenticating(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const isJson = (res.headers.get("content-type") || "").includes("application/json");
      if (!isJson) {
        setAuthError("이 사이트에는 서버가 없어 관리자 로그인을 할 수 없어요.");
        return;
      }
      const data = await res.json();
      if (res.ok && data.success && data.token) {
        setIsSuccess(true);
        setPassword("");
        setTimeout(() => {
          setIsSuccess(false);
          onSuccess({ token: data.token, expiresAt: data.expiresAt });
        }, 500);
      } else {
        setAuthError(data.error || "로그인하지 못했어요.");
      }
    } catch {
      setAuthError("서버에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0E121E] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-[#F0F4FC]">
        <button
          onClick={close}
          className="absolute top-5 right-5 p-2 rounded-full text-[#647087] hover:text-[#F0F4FC] hover:bg-white/[0.06] transition-colors cursor-pointer"
          aria-label="닫기"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center space-y-2.5 pt-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-[#4E8CFF] to-[#9C6FFF] flex items-center justify-center shadow-lg">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-xl font-bold tracking-tight text-[#F0F4FC]">관리자 로그인</h3>
          <p className="text-xs text-[#9AA5B8] leading-relaxed max-w-xs mx-auto">
            관리자 비밀번호를 입력하면 프롬프트와 말투 설정을 바꿀 수 있어요.
          </p>
        </div>

        {!serverAvailable ? (
          <div className="p-4 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-xs leading-relaxed text-amber-200">
            이 사이트(GitHub Pages)에는 서버가 없어 관리자 로그인을 할 수 없어요. 관리자 설정은 서버가 있는
            AI Studio 배포본에서 바꿔 주세요.
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-3">
            <label className="block space-y-1.5 text-left">
              <span className="text-xs text-[#9AA5B8]">비밀번호</span>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (authError) setAuthError(null);
                }}
                autoComplete="current-password"
                autoFocus
                className="w-full bg-[#161B2E] border border-white/10 focus:border-[#4E8CFF] rounded-full px-5 py-3 text-sm text-[#F0F4FC] placeholder:text-[#647087] focus:outline-none"
              />
            </label>
            <button
              type="submit"
              disabled={!password || isAuthenticating || isSuccess}
              className="w-full py-3 rounded-full bg-gradient-to-r from-[#4E8CFF] to-[#9C6FFF] hover:opacity-90 text-white text-sm font-semibold transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>확인됐어요</span>
                </>
              ) : (
                <span>{isAuthenticating ? "확인 중..." : "로그인"}</span>
              )}
            </button>
          </form>
        )}

        {authError && (
          <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-300 text-left">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <p className="leading-relaxed">{authError}</p>
          </div>
        )}

        <div className="pt-2 border-t border-white/[0.06] flex items-center justify-center gap-2 text-[11px] text-[#647087]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#4E8CFF]" />
          <span>비밀번호는 서버에서만 확인하고, 로그인은 12시간 동안 유지돼요</span>
        </div>
      </div>
    </div>
  );
};
