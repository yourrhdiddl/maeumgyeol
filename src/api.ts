// API 서버 주소
// - 비어 있으면 같은 주소의 /api 를 불러요 (AI Studio·Cloud Run처럼 화면과 서버가 함께 있을 때)
// - GitHub Pages처럼 화면만 있는 곳에서는 빌드할 때 VITE_API_BASE 로 서버 주소를 넣어요
//   예: VITE_API_BASE=https://maeumgyeol.ai.studio
const RAW_BASE: string = ((import.meta as any).env?.VITE_API_BASE as string | undefined) || "";

export const API_BASE = RAW_BASE.replace(/\/+$/, "");

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}
