import type { EmotionAnalysisResult } from "../types.ts";
import { CRISIS_REGEX, EMPATHY_SENTENCES, EMOTION_DATABASE, localGuessEmotion } from "./bookstoreDb.ts";

// 책소개와 겹치지 않는 추천 이유 3개
export function generateDistinctFits(emotionName: string): string[] {
  return [
    `마음에 ${emotionName}의 파동이 일렁일 때, 내면의 중심을 잡고 깊은 위안을 얻을 수 있는 첫 번째 추천작입니다.`,
    `복잡하게 얽힌 ${emotionName}의 기분을 차분하게 정리하고 다정한 공감과 새로운 시선을 전해줍니다.`,
    `하루의 끝에 지친 마음에 따스한 쉼표를 찍어주며 안도감과 용기를 선사하는 책입니다.`,
  ];
}

// AI 없이 문장 속 낱말로 감정을 읽어요. 서버의 대체 엔진과 GitHub Pages(서버 없음)에서 함께 사용
export function analyzeLocally(text: string): EmotionAnalysisResult {
  const cleanText = text.trim();

  if (CRISIS_REGEX.test(cleanText.replace(/\s+/g, ""))) {
    const category = localGuessEmotion(cleanText) || EMOTION_DATABASE[0];
    return {
      emotion: category.name,
      low: false,
      others: [],
      why: "많이 지치고 힘든 마음이 깊게 느껴져 먼저 보듬어 드리고 싶어요.",
      reply:
        "지금 많이 힘드시군요. 혼자 감당하지 않아도 괜찮아요. 아래 안내해 드린 전문 상담 전화(109)로 언제든 따뜻한 도움을 받아보세요.",
      fit: [
        "지친 마음에 잠시 숨을 불어넣어 주는 온기 있는 글입니다.",
        "무거운 마음의 짐을 잠시 내려놓을 수 있는 이야기입니다.",
        "혼자가 아니라는 다정한 위로를 건네는 책입니다.",
      ],
      crisis: true,
      fromAI: false,
      books: category.books,
    };
  }

  const category = localGuessEmotion(cleanText);
  const emotionName = category.name;
  return {
    emotion: emotionName,
    low: true,
    others: [],
    why: `문장 속에서 전해지는 [${emotionName}]의 결을 차분히 읽어내었습니다.`,
    reply: EMPATHY_SENTENCES[emotionName] || "이야기를 들려주셔서 감사해요. 마음에 머물러 줄 책들을 준비했어요.",
    fit: generateDistinctFits(emotionName),
    crisis: false,
    fromAI: false,
    books: category.books,
  };
}
