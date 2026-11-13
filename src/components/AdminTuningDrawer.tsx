import React, { useState } from "react";
import {
  X,
  Sliders,
  RotateCcw,
  Check,
  Play,
  Bot,
  ShieldAlert,
  Search,
  BookOpen,
  Tag,
  Code,
  Layers,
  FileText,
  LogOut,
} from "lucide-react";
import {
  AIAdminConfig,
  DEFAULT_ADMIN_CONFIG,
  DEFAULT_PROMPT_SECTIONS,
  ModularPromptSections,
  buildCompiledSystemPrompt,
} from "../data/adminConfig.ts";
import {
  EMOTION_DATABASE,
  CRISIS_KEYWORDS,
  EMPATHY_SENTENCES,
  EmotionCategory,
} from "../data/bookstoreDb.ts";
import { analyzeLocally, isNoServerResponse } from "../data/localAnalysis.ts";

interface AdminTuningDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  config: AIAdminConfig;
  onSaveConfig: (newConfig: AIAdminConfig) => void;
  adminEmail?: string;
  onLogout?: () => void;
  /** false면 서버 없이 배포된 사이트(GitHub Pages): AI·서버 저장 없이 동작 */
  aiAvailable?: boolean;
}

export const AdminTuningDrawer: React.FC<AdminTuningDrawerProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  adminEmail,
  onLogout,
  aiAvailable = true,
}) => {
  const [draftConfig, setDraftConfig] = useState<AIAdminConfig>({
    ...config,
    promptSections: config.promptSections || DEFAULT_PROMPT_SECTIONS,
  });

  const [activeTab, setActiveTab] = useState<"emotions" | "crisis" | "modular_prompt" | "test">("emotions");
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionCategory>(EMOTION_DATABASE[0]);
  const [emotionSearch, setEmotionSearch] = useState("");
  const [activePromptSection, setActivePromptSection] = useState<keyof ModularPromptSections>("roleDefinition");
  const [showFullCompiled, setShowFullCompiled] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Playground state
  const [testInput, setTestInput] = useState("요즘 밤에 잠도 잘 안 오고 마음이 계속 불안해");
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  if (!isOpen) return null;

  const handleResetToDefault = () => {
    if (confirm("시스템 프롬프트와 모든 설정을 초기 기본값으로 복원하시겠습니까?")) {
      setDraftConfig({
        ...DEFAULT_ADMIN_CONFIG,
        promptSections: { ...DEFAULT_PROMPT_SECTIONS },
      });
    }
  };

  const handleSave = () => {
    onSaveConfig(draftConfig);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleUpdatePromptSection = (key: keyof ModularPromptSections, value: string) => {
    setDraftConfig({
      ...draftConfig,
      promptSections: {
        ...(draftConfig.promptSections || DEFAULT_PROMPT_SECTIONS),
        [key]: value,
      },
    });
  };

  const handleRunTest = async () => {
    if (!testInput.trim() || isTesting) return;
    setIsTesting(true);
    setTestOutput(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: testInput,
          configOverride: draftConfig,
        }),
      });

      // 서버가 없으면(GitHub Pages) 브라우저의 낱말 분석 결과를 보여 줘요
      if (isNoServerResponse(res)) {
        const local = analyzeLocally(testInput);
        setTestOutput(
          "※ 이 사이트에는 서버가 없어 AI 대신 문장 속 낱말로 분석한 결과예요. 프롬프트·말투 설정은 반영되지 않아요.\n\n" +
            JSON.stringify(local, null, 2)
        );
        return;
      }

      const data = await res.json();
      setTestOutput(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setTestOutput(`오류 발생: ${err.message || err}`);
    } finally {
      setIsTesting(false);
    }
  };

  const filteredEmotions = EMOTION_DATABASE.filter(
    (e) =>
      e.name.includes(emotionSearch) ||
      e.keywords.some((k) => k.includes(emotionSearch)) ||
      e.books.some((b) => b.title.includes(emotionSearch))
  );

  const promptSectionMeta: { key: keyof ModularPromptSections; title: string; desc: string }[] = [
    {
      key: "roleDefinition",
      title: "1. 역할 및 정체성 정의",
      desc: "마음결 AI의 존재 목적과 비상담적 한계 고지",
    },
    {
      key: "emotionClassification",
      title: "2. 감정 분석 및 추론 규칙",
      desc: "30개 감정 분류 기준, 모호할 때 처리 및 다중 감정 규정",
    },
    {
      key: "empathyReplyGuideline",
      title: "3. 공감 답변 지침",
      desc: "해요체 2문장 이내 공감 문장 생성 규정",
    },
    {
      key: "bookRecommendationGuideline",
      title: "4. 도서 추천 사유 지침",
      desc: "도서 3권 각각에 대한 사용자 맞춤 추천 이유 작성 규칙",
    },
    {
      key: "safetyProtocol",
      title: "5. 위기 감지 및 안전 프로토콜",
      desc: "자해/극단적 선택 감지 시 crisis: true 플래그 및 긴급 지원 규칙",
    },
    {
      key: "outputSchema",
      title: "6. JSON 출력 스키마",
      desc: "정형화된 순수 JSON 데이터 출력 필드 명세",
    },
  ];

  const currentSections = draftConfig.promptSections || DEFAULT_PROMPT_SECTIONS;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-[#0E121E] border-l border-white/10 h-full flex flex-col shadow-2xl text-[#F0F4FC]">
        {/* Drawer Header */}
        <div className="p-5 sm:p-6 border-b border-white/[0.06] flex items-center justify-between bg-[#080A10]/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#4E8CFF]/20 to-[#9C6FFF]/20 border border-white/10 flex items-center justify-center text-[#4E8CFF]">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-[#F0F4FC]">
                마음결 관리자 스튜디오
              </h2>
              <p className="text-xs text-[#9AA5B8]">
                학습된 감정/키워드 검사, 위기단어 관리 및 기능별 상세 시스템 프롬프트 제어
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {adminEmail && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-xs text-[#9AA5B8]">
                <span className="w-2 h-2 rounded-full bg-[#34A853]"></span>
                <span className="font-mono text-[11px] text-[#F0F4FC]">{adminEmail}</span>
              </div>
            )}
            {onLogout && (
              <button
                onClick={onLogout}
                className="text-xs text-[#9AA5B8] hover:text-red-400 p-2 rounded-full hover:bg-red-500/10 flex items-center gap-1 transition-colors cursor-pointer"
                title="관리자 로그아웃"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">로그아웃</span>
              </button>
            )}
            <button
              onClick={handleResetToDefault}
              className="text-xs text-[#9AA5B8] hover:text-[#F0F4FC] p-2 rounded-full hover:bg-white/[0.06] flex items-center gap-1.5 transition-colors cursor-pointer"
              title="초기값으로 복원"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">초기화</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-[#647087] hover:text-[#F0F4FC] hover:bg-white/[0.06] transition-colors cursor-pointer"
              aria-label="닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/[0.06] bg-[#0E121E] px-6 pt-3 gap-2 text-xs font-medium overflow-x-auto">
          <button
            onClick={() => setActiveTab("emotions")}
            className={`pb-3 px-3.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "emotions"
                ? "border-[#4E8CFF] text-[#4E8CFF] font-semibold"
                : "border-transparent text-[#9AA5B8] hover:text-[#F0F4FC]"
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>학습된 감정 & 키워드 (30개)</span>
          </button>

          <button
            onClick={() => setActiveTab("crisis")}
            className={`pb-3 px-3.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "crisis"
                ? "border-[#4E8CFF] text-[#4E8CFF] font-semibold"
                : "border-transparent text-[#9AA5B8] hover:text-[#F0F4FC]"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-[#E879F9]" />
            <span>위기 감지 단어 리스트</span>
          </button>

          <button
            onClick={() => setActiveTab("modular_prompt")}
            className={`pb-3 px-3.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "modular_prompt"
                ? "border-[#4E8CFF] text-[#4E8CFF] font-semibold"
                : "border-transparent text-[#9AA5B8] hover:text-[#F0F4FC]"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>기능별 시스템 프롬프트</span>
          </button>

          <button
            onClick={() => setActiveTab("test")}
            className={`pb-3 px-3.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "test"
                ? "border-[#4E8CFF] text-[#4E8CFF] font-semibold"
                : "border-transparent text-[#9AA5B8] hover:text-[#F0F4FC]"
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>실시간 테스트</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          {!aiAvailable && (
            <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-xs leading-relaxed text-amber-200">
              이 사이트(GitHub Pages)에는 서버가 없어 AI를 쓰지 않아요. 저장한 설정은 이 브라우저에만 남고,
              프롬프트·말투 설정은 AI가 동작하는 AI Studio 배포본에서만 답변에 반영돼요.
            </div>
          )}
          {/* TAB 1: LEARNED EMOTIONS & KEYWORDS INSPECTOR */}
          {activeTab === "emotions" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-semibold text-[#F0F4FC]">
                  학습된 30개 감정 및 연결 키워드 상세 조회
                </h3>
                <p className="text-xs text-[#9AA5B8] mt-1">
                  감정 단어를 클릭하시면 모델이 감정을 포착할 때 참조하는 연결 키워드(정규식 패턴), 준비된 공감 문장, 매핑된 도서 3권을 확인할 수 있습니다.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#647087]" />
                <input
                  type="text"
                  value={emotionSearch}
                  onChange={(e) => setEmotionSearch(e.target.value)}
                  placeholder="감정명, 키워드, 책 검색..."
                  className="w-full bg-[#121624] border border-white/10 rounded-full pl-11 pr-5 py-2.5 text-xs sm:text-sm text-[#F0F4FC] placeholder:text-[#647087] focus:outline-none focus:border-[#4E8CFF]"
                />
              </div>

              {/* 30 Emotions Grid */}
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
                {filteredEmotions.map((e) => {
                  const isSelected = selectedEmotion.name === e.name;
                  return (
                    <button
                      key={e.name}
                      type="button"
                      onClick={() => setSelectedEmotion(e)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${
                        isSelected
                          ? "bg-gradient-to-r from-[#4E8CFF] to-[#9C6FFF] border-transparent text-white font-semibold shadow-md shadow-[#4E8CFF]/20"
                          : "bg-[#121624] border-white/[0.08] text-[#9AA5B8] hover:text-[#F0F4FC] hover:border-white/20"
                      }`}
                    >
                      {e.name}
                      <span className="ml-1 text-[10px] opacity-70">
                        ({e.keywords.length}개)
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Selected Emotion Detail Inspector Card */}
              {selectedEmotion && (
                <div className="bg-[#121624] border border-white/[0.08] rounded-3xl p-5 sm:p-6 space-y-4 shadow-lg animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg font-semibold text-[#F0F4FC]">
                        #{selectedEmotion.name}
                      </span>
                      {selectedEmotion.isPositive && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E879F9]/20 text-[#E879F9] border border-[#E879F9]/30 font-semibold">
                          긍정 감정
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[#647087] font-mono">
                      연결 키워드: {selectedEmotion.keywords.length}개 패턴
                    </span>
                  </div>

                  {/* Connected Keywords */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-[#4E8CFF] block">
                      연결된 관련 키워드 및 정규식 패턴:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedEmotion.keywords.map((kw, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg bg-[#080A10] border border-white/10 text-[#F0F4FC] font-mono text-xs"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Pre-scripted Empathy Sentence */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-[#9C6FFF] block">
                      기본 공감 문장 (Fallback EMP):
                    </span>
                    <p className="text-xs sm:text-sm text-[#F0F4FC] bg-[#080A10] p-3 rounded-xl border border-white/[0.06] leading-relaxed">
                      "{EMPATHY_SENTENCES[selectedEmotion.name] || "당신의 감정을 소중히 응원합니다."}"
                    </p>
                  </div>

                  {/* 3 Curated Books */}
                  <div className="space-y-2 pt-1">
                    <span className="text-xs font-semibold text-[#9AA5B8] block">
                      연결된 큐레이션 도서 3권:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {selectedEmotion.books.map((bk, i) => (
                        <div
                          key={i}
                          className="bg-[#080A10] border border-white/[0.06] p-3.5 rounded-2xl space-y-1.5 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono text-[#4E8CFF]">
                              0{i + 1}
                            </span>
                            <span className="text-[9px] text-[#647087]">
                              {bk.sourceTag}
                            </span>
                          </div>
                          <h4 className="font-semibold text-[#F0F4FC] line-clamp-1">
                            {bk.title}
                          </h4>
                          <p className="text-[11px] text-[#647087]">{bk.author}</p>
                          <p className="text-[11px] text-[#9AA5B8] line-clamp-2 pt-1">
                            {bk.intro}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CRISIS WORDS LIST */}
          {activeTab === "crisis" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-semibold text-[#F0F4FC] flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-[#E879F9]" />
                  <span>위기 감지 단어 리스트 & 긴급 안전 프로토콜</span>
                </h3>
                <p className="text-xs text-[#9AA5B8] mt-1">
                  사용자 문장에 아래 단어가 감지되면 Gemini AI 호출 여부와 무관하게 자살예방 상담전화(109) 안내가 최우선으로 제공됩니다.
                </p>
              </div>

              {/* Crisis Keywords Badges */}
              <div className="bg-[#121624] border border-white/[0.08] p-5 sm:p-6 rounded-3xl space-y-4">
                <span className="text-xs font-semibold text-[#E879F9] block">
                  실시간 모니터링 중인 위기 감지 단어 ({CRISIS_KEYWORDS.length}개):
                </span>
                <div className="flex flex-wrap gap-2">
                  {CRISIS_KEYWORDS.map((word, i) => (
                    <span
                      key={i}
                      className="px-3.5 py-1.5 rounded-full bg-[#E879F9]/15 border border-[#E879F9]/30 text-[#F0F4FC] text-xs font-medium flex items-center gap-1.5"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E879F9]"></span>
                      <span>"{word}"</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Protocol Rules */}
              <div className="bg-[#121624] border border-white/[0.08] p-5 sm:p-6 rounded-3xl space-y-3 text-xs leading-relaxed">
                <h4 className="font-semibold text-sm text-[#F0F4FC]">
                  위기 대응 메커니즘 동작 기준
                </h4>
                <ul className="space-y-2 text-[#9AA5B8] list-disc list-inside">
                  <li>
                    <strong className="text-[#F0F4FC]">정규식 필터링 우선 실행:</strong> 문장 전처리 후 공백을 제거한 상태에서 해당 키워드가 매칭되면 즉시 위기 모드로 전환됩니다.
                  </li>
                  <li>
                    <strong className="text-[#F0F4FC]">상담전화 우선 노출:</strong> 자살예방 상담전화(109), 정신건강 위기상담전화(1577-0199), 119 긴급 안내 카드가 최상단에 고정됩니다.
                  </li>
                  <li>
                    <strong className="text-[#F0F4FC]">도서 노출 보호:</strong> 심리적 위기 상황에서 책 구매 유도를 방지하기 위해 도서 카드는 기본 접힘 처리되며, 사용자가 직접 펼치기를 눌렀을 때만 볼 수 있습니다.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: MODULAR SYSTEM PROMPT (FUNCTION BY FUNCTION) */}
          {activeTab === "modular_prompt" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-[#F0F4FC] flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#4E8CFF]" />
                    <span>기능별 세부 시스템 프롬프트</span>
                  </h3>
                  <p className="text-xs text-[#9AA5B8] mt-0.5">
                    각 기능 모듈별로 명확하게 분할하여 프롬프트를 열람하고 편집할 수 있습니다.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowFullCompiled(!showFullCompiled)}
                  className="px-3.5 py-1.5 rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-xs text-[#4E8CFF] font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{showFullCompiled ? "모듈별 보기" : "전체 컴파일본 보기"}</span>
                </button>
              </div>

              {!showFullCompiled ? (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                  {/* Module Nav List */}
                  <div className="md:col-span-4 space-y-1.5">
                    {promptSectionMeta.map((item) => {
                      const isActive = activePromptSection === item.key;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setActivePromptSection(item.key)}
                          className={`w-full p-3.5 rounded-2xl text-left transition-all cursor-pointer border ${
                            isActive
                              ? "bg-[#161B2E] border-[#4E8CFF] text-[#F0F4FC] shadow-md"
                              : "bg-[#121624] border-white/[0.08] text-[#9AA5B8] hover:text-[#F0F4FC] hover:border-white/20"
                          }`}
                        >
                          <span className="text-xs font-semibold block">{item.title}</span>
                          <span className="text-[10px] text-[#647087] block mt-0.5 line-clamp-1">
                            {item.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Section Editor */}
                  <div className="md:col-span-8 bg-[#121624] border border-white/[0.08] p-5 rounded-3xl space-y-3">
                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                      <div>
                        <h4 className="text-xs sm:text-sm font-semibold text-[#F0F4FC]">
                          {promptSectionMeta.find((m) => m.key === activePromptSection)?.title}
                        </h4>
                        <p className="text-[11px] text-[#647087]">
                          {promptSectionMeta.find((m) => m.key === activePromptSection)?.desc}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono text-[#4E8CFF]">
                        {currentSections[activePromptSection].length}자
                      </span>
                    </div>

                    <textarea
                      value={currentSections[activePromptSection]}
                      onChange={(e) =>
                        handleUpdatePromptSection(activePromptSection, e.target.value)
                      }
                      rows={12}
                      className="w-full bg-[#080A10] border border-white/10 focus:border-[#4E8CFF] focus:ring-2 focus:ring-[#4E8CFF]/20 rounded-2xl p-4 font-mono text-xs text-[#F0F4FC] leading-relaxed focus:outline-none"
                      spellCheck={false}
                    />

                    {activePromptSection === "empathyReplyGuideline" && (
                      <p className="text-[11px] text-[#4E8CFF]">
                        💡 <code className="font-mono">{"{{TONE_GUIDELINE}}"}</code> 변수가 위치한 자리에 게스트가 선택한 말투 지침이 동적으로 주입됩니다.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                /* Full Compiled Prompt Preview */
                <div className="space-y-3">
                  <span className="text-xs font-semibold text-[#4E8CFF] block">
                    Gemini 3.8 Flash 모델에 최종 전송되는 컴파일된 시스템 프롬프트:
                  </span>
                  <pre className="bg-[#080A10] border border-white/10 p-5 rounded-3xl text-xs font-mono text-[#F0F4FC] overflow-x-auto max-h-[500px] leading-relaxed whitespace-pre-wrap">
                    {buildCompiledSystemPrompt(draftConfig)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: REAL-TIME TEST PLAYGROUND */}
          {activeTab === "test" && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-semibold text-[#F0F4FC]">
                  프롬프트 실시간 테스트 플레이그라운드
                </h3>
                <p className="text-xs text-[#9AA5B8] mt-1">
                  수정한 기능별 프롬프트와 파라미터가 모델에 어떻게 반영되는지 즉시 시험해 봅니다.
                </p>
              </div>

              <div className="space-y-2.5">
                <label className="text-xs text-[#9AA5B8] block font-medium">
                  테스트 입력 문장:
                </label>
                <div className="flex gap-2.5">
                  <input
                    type="text"
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    placeholder="테스트할 감정 문장을 입력하세요"
                    className="flex-1 bg-[#080A10] border border-white/10 focus:border-[#4E8CFF] rounded-full px-5 py-3 text-xs sm:text-sm text-[#F0F4FC] focus:outline-none"
                  />
                  <button
                    onClick={handleRunTest}
                    disabled={isTesting || !testInput.trim()}
                    className="px-5 py-3 rounded-full bg-gradient-to-r from-[#4E8CFF] to-[#9C6FFF] text-white font-semibold text-xs hover:opacity-90 transition-all disabled:opacity-40 flex items-center gap-1.5 cursor-pointer shrink-0 shadow-md shadow-[#4E8CFF]/20"
                  >
                    {isTesting ? (
                      <span className="animate-spin">⏳</span>
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                    <span>테스트 실행</span>
                  </button>
                </div>
              </div>

              {testOutput && (
                <div className="space-y-1.5">
                  <span className="text-xs text-[#4E8CFF] font-mono block">
                    응답 결과 (Parsed JSON):
                  </span>
                  <pre className="bg-[#080A10] border border-white/[0.08] p-4 rounded-2xl text-[11px] font-mono text-[#F0F4FC] overflow-x-auto max-h-72 leading-relaxed">
                    {testOutput}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-5 sm:p-6 border-t border-white/[0.06] bg-[#080A10]/70 flex items-center justify-between">
          <div className="text-xs text-[#9AA5B8]">
            {aiAvailable ? "설정 저장 시 다음 대화부터 즉시 적용됩니다" : "설정은 이 브라우저에만 저장됩니다"}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-full bg-white/[0.06] hover:bg-white/10 text-xs font-medium text-[#9AA5B8] hover:text-[#F0F4FC] transition-colors cursor-pointer"
            >
              닫기
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#4E8CFF] to-[#9C6FFF] hover:opacity-90 text-white text-xs font-semibold transition-all shadow-md shadow-[#4E8CFF]/25 flex items-center gap-1.5 cursor-pointer"
            >
              {isSaved ? <Check className="w-4 h-4" /> : null}
              <span>{isSaved ? "저장 완료!" : "설정 저장 및 적용"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
