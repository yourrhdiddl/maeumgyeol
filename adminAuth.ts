// 관리자 인증 (서버 전용)
// - 비밀번호는 서버 환경변수 ADMIN_PASSWORD 에만 둡니다. 화면 코드에는 들어가지 않아요.
// - 로그인에 성공하면 12시간짜리 서명된 토큰을 줍니다. 토큰은 비밀번호에서 만든 키로 서명해서
//   Cloud Run 인스턴스가 여러 개여도, 서버가 다시 시작돼도 그대로 통해요.
// - 비밀번호를 바꾸면 기존 토큰은 모두 무효가 됩니다.
import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12시간
const MAX_FAILS = 5; // 같은 IP에서 10분 안에 5번 틀리면 잠시 막아요
const FAIL_WINDOW_MS = 10 * 60 * 1000;

function adminPassword(): string {
  const p = process.env.ADMIN_PASSWORD;
  return p && p.trim() ? p : "";
}

export function isAdminConfigured(): boolean {
  return adminPassword().length > 0;
}

function signingKey(): Buffer {
  return crypto.createHash("sha256").update("maeumgyeol-admin-session:" + adminPassword()).digest();
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", signingKey()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ab = crypto.createHash("sha256").update(a).digest();
  const bb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ab, bb);
}

export function issueToken(): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const payload = String(expiresAt);
  return { token: `${payload}.${sign(payload)}`, expiresAt };
}

export function isValidToken(token: string | undefined): boolean {
  if (!token || !isAdminConfigured()) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  if (!safeEqual(sig, sign(payload))) return false;
  const exp = Number(payload);
  return Number.isFinite(exp) && exp > Date.now();
}

export function tokenFromRequest(req: Request): string | undefined {
  const h = req.headers.authorization || "";
  return h.startsWith("Bearer ") ? h.slice(7).trim() : undefined;
}

// 로그인 실패 횟수 (IP별, 메모리)
const fails = new Map<string, { count: number; first: number }>();

export function checkPassword(ip: string, password: unknown): "ok" | "wrong" | "locked" | "not_configured" {
  if (!isAdminConfigured()) return "not_configured";
  const now = Date.now();
  const f = fails.get(ip);
  if (f && now - f.first > FAIL_WINDOW_MS) fails.delete(ip);
  const cur = fails.get(ip);
  if (cur && cur.count >= MAX_FAILS) return "locked";

  if (typeof password === "string" && safeEqual(password, adminPassword())) {
    fails.delete(ip);
    return "ok";
  }
  if (cur) cur.count++;
  else fails.set(ip, { count: 1, first: now });
  return "wrong";
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!isValidToken(tokenFromRequest(req))) {
    return res.status(401).json({ success: false, error: "관리자 로그인이 필요해요." });
  }
  next();
}
