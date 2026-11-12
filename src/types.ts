import { RecommendedBook } from "./data/bookstoreDb.ts";

export interface EmotionAnalysisResult {
  emotion: string;
  low: boolean;
  others: string[];
  why: string;
  reply: string;
  fit: string[];
  crisis: boolean;
  fromAI: boolean;
  books: [RecommendedBook, RecommendedBook, RecommendedBook] | RecommendedBook[];
}

export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  result?: EmotionAnalysisResult;
  isError?: boolean;
  failedPrompt?: string;
}
