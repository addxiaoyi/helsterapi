import React, { useState, useRef, useEffect, useCallback } from "react";
import { useLang } from "../../lib/LanguageContext";
import { SelectMenu } from "../../components/ui/SelectMenu";
import {
  Send,
  User,
  Cpu,
  Settings2,
  Square,
  Search,
  SlidersHorizontal,
  MessageSquare,
  ChevronDown,
  AlignLeft,
  X,
  Box,
  History,
  Trash2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "../../lib/api";

type Role = "user" | "assistant" | "system";
type Message = { role: Role; content: string };
type ChatSession = {
  id: string;
  title: string;
  model: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
};

const STORAGE_KEY = "helstare-chat-sessions-v1";
const ACTIVE_KEY = "helstare-chat-active-session-v1";
const SESSION_LIMIT = 30;

function loadSessions(): ChatSession[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatSession[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistSessions(items: ChatSession[]) {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(items.slice(0, SESSION_LIMIT)),
    );
  } catch {
    /* storage may be full or disabled */
  }
}

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function deriveTitle(messages: Message[]) {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "New session";
  const text = firstUser.content.replace(/\s+/g, " ").trim();
  return text.length > 32 ? `${text.slice(0, 32)}…` : text;
}

export default function Chat() {
  const { t } = useLang();
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const items = loadSessions();
    return items.length
      ? items
      : [
          {
            id: makeId(),
            title: t("New session", "新会话"),
            model: "",
            createdAt: Date.now(),
            updatedAt: Date.now(),
            messages: [],
          },
        ];
  });
  const [activeId, setActiveId] = useState<string>(() => {
    return localStorage.getItem(ACTIVE_KEY) ?? sessions[0]?.id ?? makeId();
  });
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [showHistoryMobile, setShowHistoryMobile] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const [models, setModels] = useState<string[]>([]);
  const [modelsError, setModelsError] = useState<string | null>(null);

  useEffect(() => {
    void api
      .userModels()
      .then((items) => {
        const available = items
          .map((item) => {
            if (typeof item === "string") return item;
            if (!item || typeof item !== "object") return null;
            const model = item as Record<string, unknown>;
            return typeof model.model_name === "string"
              ? model.model_name
              : typeof model.name === "string"
                ? model.name
                : null;
          })
          .filter((item): item is string => Boolean(item));
        setModels(available);
        setSessions((current) => {
          if (current.length === 0 || current[0].model) return current;
          return [
            { ...current[0], model: available[0] ?? current[0].model },
            ...current.slice(1),
          ];
        });
      })
      .catch((cause) => {
        console.error("Unable to load models for the playground", cause);
        setModelsError(t("Unable to load available models.", "可用模型加载失败。"));
        setModels([]);
      });
  }, [t]);

  useEffect(() => {
    persistSessions(sessions);
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem(ACTIVE_KEY, activeId);
  }, [activeId]);

  const activeSession = sessions.find((s) => s.id === activeId) ?? sessions[0];
  const messages = activeSession?.messages ?? [];
  const model = activeSession?.model ?? "";

  const updateActive = useCallback(
    (updater: (s: ChatSession) => ChatSession) => {
      setSessions((current) =>
        current.map((s) => (s.id === activeId ? updater(s) : s)),
      );
    },
    [activeId],
  );

  const [systemPrompt, setSystemPrompt] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [topP, setTopP] = useState(1.0);
  const [frequencyPenalty, setFrequencyPenalty] = useState(0);
  const [presencePenalty, setPresencePenalty] = useState(0);
  const [stopSequences, setStopSequences] = useState("");
  const [responseFormat, setResponseFormat] = useState<"text" | "json_object">(
    "text",
  );
  const [showConfigMobile, setShowConfigMobile] = useState(false);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages, isGenerating]);

  const setModel = useCallback(
    (value: string) => {
      updateActive((s) => ({ ...s, model: value }));
    },
    [updateActive],
  );

  const createSession = useCallback(() => {
    const id = makeId();
    const session: ChatSession = {
      id,
      title: t("New session", "新会话"),
      model,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [
        {
          role: "system",
          content: "You are interacting with the Orchestrator Console.",
        },
      ],
    };
    setSessions((current) => [session, ...current].slice(0, SESSION_LIMIT));
    setActiveId(id);
    setShowHistoryMobile(false);
  }, [model, t]);

  const deleteSession = useCallback(
    (id: string) => {
      setSessions((current) => {
        const filtered = current.filter((s) => s.id !== id);
        if (filtered.length === 0) {
          const blank: ChatSession = {
            id: makeId(),
            title: t("New session", "新会话"),
            model,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            messages: [],
          };
          setActiveId(blank.id);
          return [blank];
        }
        if (id === activeId) setActiveId(filtered[0].id);
        return filtered;
      });
    },
    [activeId, model, t],
  );

  const clearActiveSession = useCallback(() => {
    updateActive((s) => ({
      ...s,
      title: t("New session", "新会话"),
      messages: [],
    }));
  }, [t, updateActive]);

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return;
    if (!model) {
      updateActive((s) => ({
        ...s,
        updatedAt: Date.now(),
        messages: [
          ...s.messages,
          {
            role: "assistant",
            content: t(
              "No available model is configured for this account.",
              "当前账户没有可用模型配置。",
            ),
          },
        ],
      }));
      return;
    }
    const userText = input;
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setStreamError(null);

    const baseMessages: Message[] = systemPrompt
      ? [{ role: "system", content: systemPrompt }, ...messages]
      : messages;
    const nextUser: Message = { role: "user", content: userText };
    const baseWithUser: Message[] = [...baseMessages, nextUser];
    updateActive((s) => ({
      ...s,
      updatedAt: Date.now(),
      title:
        s.title === t("New session", "新会话") ||
        s.title === t("Welcome session", "欢迎会话")
          ? deriveTitle(baseWithUser)
          : s.title,
      messages: [...s.messages, nextUser],
    }));

    const controller = new AbortController();
    requestRef.current = controller;
    setIsGenerating(true);
    try {
      let accumulated = "";
      for await (const delta of api.playgroundStream(
        {
          model,
          messages: baseWithUser,
          temperature,
          max_tokens: maxTokens,
          top_p: topP,
          frequency_penalty: frequencyPenalty || undefined,
          presence_penalty: presencePenalty || undefined,
          ...(stopSequences.trim()
            ? {
                stop: stopSequences
                  .split(/[,\n]/)
                  .map((value) => value.trim())
                  .filter(Boolean),
              }
            : {}),
          ...(responseFormat === "json_object"
            ? { response_format: { type: "json_object" } }
            : {}),
        },
        controller.signal,
      )) {
        accumulated += delta;
        const snapshot = accumulated;
        updateActive((s) => {
          const list = s.messages;
          if (
            list.length > 0 &&
            list[list.length - 1].role === "assistant"
          ) {
            const next = list.slice(0, -1);
            return {
              ...s,
              messages: [...next, { role: "assistant", content: snapshot }],
            };
          }
          return {
            ...s,
            messages: [...list, { role: "assistant", content: snapshot }],
          };
        });
      }
      if (!accumulated) {
        updateActive((s) => ({
          ...s,
          messages: [
            ...s.messages,
            {
              role: "assistant",
              content: t("The model returned no content.", "模型未返回内容。"),
            },
          ],
        }));
      }
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      const message =
        cause instanceof Error
          ? cause.message
          : t("Request failed.", "请求失败。");
      setStreamError(message);
      updateActive((s) => ({
        ...s,
        messages: [...s.messages, { role: "assistant", content: message }],
      }));
    } finally {
      requestRef.current = null;
      setIsGenerating(false);
    }
  };

  const stopGeneration = () => requestRef.current?.abort();
  return (
    <div className="w-full flex-1 flex flex-col lg:flex-row min-h-[600px] max-h-full bg-primary border border-[#121110]/10 shadow-page-strong relative z-0 overflow-hidden">
      {" "}
      {/* Mobile Config Toggle */}{" "}
      <div className="lg:hidden h-14 shrink-0 border-b border-[#121110]/10 flex items-center justify-between px-4 bg-white/50 relative z-20">
        {" "}
        <div className="flex items-center gap-2">
          {" "}
          <Cpu className="w-4 h-4 stroke-[1.5]" />{" "}
          <span className="font-serif text-body tracking-wide">
            {t("Playground", "游乐场")}
          </span>{" "}
        </div>{" "}
        <button
          onClick={() => setShowConfigMobile(!showConfigMobile)}
          className="flex items-center gap-2 text-overline font-mono uppercase tracking-widest bg-inverse text-white px-3 py-1.5 hover:bg-black transition-all duration-300 active:scale-[0.98] ease-out-expo rounded-none"
        >
          {" "}
          <Settings2 className="w-3.5 h-3.5" /> {t("Config", "配置")}{" "}
        </button>{" "}
      </div>{" "}
      {/* Main Chat Area */}{" "}
      <div className="flex-1 flex flex-col relative bg-transparent overflow-hidden transition-all duration-300">
        {" "}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none mix-blend-multiply" />{" "}
        {/* Header - Desktop */}{" "}
        <div className="hidden lg:flex h-14 flex-shrink-0 px-6 border-b border-[#121110]/10 items-center justify-between bg-white relative z-10">
          {" "}
          <div className="flex items-center gap-4">
            {" "}
            <h2 className="font-serif text-body tracking-wide text-[#121110]">
              {t("Interactive Console", "交互控制台")}
            </h2>{" "}
            <div className="h-4 w-px bg-inverse/40 mx-2" />{" "}
            <span className="text-overline font-mono uppercase tracking-widest text-[#121110]/50 bg-inverse/5 px-2 py-0.5 border border-[#121110]/5">
              {model.toUpperCase()}
            </span>{" "}
          </div>{" "}
        </div>{" "}
        {/* Message Log */}{" "}
        <div
          ref={logRef}
          className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 space-y-8 relative z-10 no-scrollbar scroll-smooth"
        >
          {" "}
          {streamError && (
            <div className="border border-red-900/30 bg-red-50 px-4 py-2 text-[12px] text-red-700">
              {streamError}
            </div>
          )}{" "}
          {modelsError && (
            <div className="border border-red-900/30 bg-red-50 px-4 py-3 text-[12px] text-red-700 flex items-center justify-between gap-4">
              <span>{modelsError}</span>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="shrink-0 underline underline-offset-2"
              >
                {t("Retry", "重试")}
              </button>
            </div>
          )}{" "}
          {!modelsError && models.length === 0 && !isGenerating && messages.length === 0 && (
            <div className="text-center text-[12px] text-[#121110]/45 py-10">
              {t("No available models.", "暂无可用模型。")}
            </div>
          )}{" "}
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-4 md:gap-6 group animate-in slide-in-from-bottom-2 fade-in duration-300 ${msg.role === "user" ? "ml-auto flex-row-reverse max-w-[95%] md:max-w-[80%]" : "max-w-[95%] md:max-w-[85%]"}`}
            >
              {" "}
              {msg.role !== "system" && (
                <div
                  className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center shrink-0 border transition-colors ${msg.role === "user" ? "bg-inverse text-[#FAFAFA] border-[#121110] shadow-avatar" : "bg-primary text-[#121110] border-[#121110]/10 group-hover:border-[#121110]/20 shadow-overlay transition-colors duration-300"}`}
                >
                  {" "}
                  {msg.role === "user" ? (
                    <User className="w-4 h-4 stroke-[1.5]" />
                  ) : (
                    <Cpu className="w-4 h-4 stroke-[1.5]" />
                  )}{" "}
                </div>
              )}{" "}
              <div
                className={`pt-1 md:pt-1.5 text-label md:text-body leading-relaxed font-sans ${msg.role === "system" ? "text-[#121110]/40 font-mono uppercase tracking-widest text-caption bg-inverse/5 p-4 border border-[#121110]/10 w-full text-center" : "text-[#121110] break-words"}`}
              >
                {" "}
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm md:prose-base max-w-none prose-p:leading-relaxed prose-pre:bg-inverse/5 prose-pre:text-[#121110] prose-pre:border prose-pre:border-[#121110]/10 prose-pre:rounded-none prose-code:text-[#121110] prose-code:bg-inverse/5 prose-code:px-1 prose-code:py-0.5 prose-headings:font-serif prose-a:text-[#121110] prose-a:underline prose-a:underline-offset-4 hover:prose-a:text-black">
                    {" "}
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>{" "}
                  </div>
                ) : (
                  msg.content
                )}{" "}
              </div>{" "}
            </div>
          ))}{" "}
          {isGenerating && (
            <div className="flex gap-4 md:gap-6 max-w-[85%] animate-in fade-in duration-300">
              {" "}
              <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center shrink-0 border bg-white text-[#121110] border-[#121110]/15 shadow-sm">
                {" "}
                <Cpu className="w-4 h-4 stroke-[1.5]" />{" "}
              </div>{" "}
              <div className="pt-3.5 flex items-center gap-2">
                {" "}
                <div className="w-1.5 h-1.5 bg-inverse/40 rounded-none animate-pulse"></div>{" "}
                <div
                  className="w-1.5 h-1.5 bg-inverse/60 rounded-none animate-pulse"
                  style={{ animationDelay: "0.2s" }}
                ></div>{" "}
                <div
                  className="w-1.5 h-1.5 bg-inverse/80 rounded-none animate-pulse"
                  style={{ animationDelay: "0.4s" }}
                ></div>{" "}
              </div>{" "}
            </div>
          )}{" "}
        </div>{" "}
        {/* Input Box Area */}{" "}
        <div className="p-4 md:p-6 bg-white/50 border-t border-[#121110]/10 relative z-10 flex flex-col justify-center shrink-0">
          {" "}
          <div className="max-w-4xl mx-auto w-full relative flex items-end gap-3 bg-white border border-[#121110]/15 focus-within:border-[#121110] focus-within:ring-1 focus-within:ring-[#121110] transition-all duration-300 ease-out-expo shadow-sm focus-within:shadow-md p-1.5">
            {" "}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (textareaRef.current) {
                  textareaRef.current.style.height = "auto";
                  textareaRef.current.style.height =
                    Math.min(textareaRef.current.scrollHeight, 200) + "px";
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={t(
                "Message the orchestrator...",
                "向编排器发送消息...",
              )}
              className="flex-1 max-h-[200px] min-h-[44px] bg-transparent border-none outline-none resize-none text-label md:text-body leading-relaxed text-[#121110] placeholder:text-[#121110]/30 font-sans p-2.5 scrollbar-thin"
              rows={1}
            />{" "}
            <button
              onClick={isGenerating ? stopGeneration : handleSend}
              disabled={!isGenerating && (!input.trim() || !model)}
              className={`w-10 h-10 md:w-11 md:h-11 flex items-center justify-center shrink-0 transition-all ${isGenerating || input.trim() ? "bg-inverse text-[#FAFAFA] hover:bg-black shadow-md active:scale-95" : "bg-transparent text-[#121110]/30 hover:bg-inverse/5"}`}
            >
              {" "}
              {isGenerating ? (
                <Square className="w-4 h-4 fill-current" />
              ) : (
                <Send className="w-4 h-4 stroke-[1.5] transform -translate-x-0.5 translate-y-0.5" />
              )}{" "}
            </button>{" "}
          </div>{" "}
          <div className="max-w-4xl mx-auto w-full mt-3 flex justify-between items-center px-1">
            {" "}
            <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#121110]/40 hidden sm:inline">
              {" "}
              {t("Shift + Enter to insert newline", "Shift + Enter 换行")}{" "}
            </span>{" "}
            <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#121110]/40 sm:hidden">
              {" "}
              {t("Ready", "就绪")}{" "}
            </span>{" "}
            <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#121110]/40">
              {" "}
              {t("Tokens:", "令牌:")} {Math.round(input.length / 4)}{" "}
            </span>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      {/* Configuration Sidebar (Right Side Desktop / Drawer on Mobile) */}{" "}
      <div
        className={`absolute lg:relative top-14 bottom-0 left-0 right-0 lg:top-0 lg:w-[320px] xl:w-[360px] lg:border-l border-[#121110]/10 bg-primary lg:bg-primary flex flex-col shrink-0 transition-transform duration-300 ease-in-out z-30 ${showConfigMobile ? "translate-x-0" : "translate-x-full lg:translate-x-0"}`}
      >
        {" "}
        {/* Header for Sidebar */}{" "}
        <div className="h-14 flex shrink-0 items-center justify-between px-6 border-b border-[#121110]/10 bg-white/50 ">
          {" "}
          <div className="flex items-center gap-3 text-[#121110]">
            {" "}
            <SlidersHorizontal className="w-4 h-4 stroke-[1.5]" />{" "}
            <span className="font-serif text-label tracking-wide font-medium">
              {t("Configuration", "模型配置")}
            </span>{" "}
          </div>{" "}
          <button
            className="lg:hidden text-[#121110]/50 hover:text-[#121110] transition-colors p-1"
            onClick={() => setShowConfigMobile(false)}
          >
            {" "}
            <X className="w-5 h-5 stroke-[1.5]" />{" "}
          </button>{" "}
        </div>{" "}
        <div className="flex-1 overflow-y-auto p-6 space-y-10 no-scrollbar">
          {" "}
          {/* Model Selection */}{" "}
          <div className="space-y-4">
            {" "}
            <label className="text-overline font-mono uppercase tracking-[0.2em] text-[#121110]/60 flex items-center gap-2">
              {" "}
              <Box className="w-3 h-3" /> {t("Model", "语言模型")}{" "}
            </label>{" "}
            <div className="relative group">
              {" "}
              <SelectMenu value={model} onChange={setModel} options={models.map((availableModel) => ({ value: availableModel, label: availableModel }))} />
              <ChevronDown className="w-4 h-4 absolute right-0 top-1/2 -translate-y-1/2 text-[#121110]/40 pointer-events-none stroke-[1.5]" />{" "}
            </div>{" "}
          </div>{" "}
          {/* System Prompt */}{" "}
          <div className="space-y-4">
            {" "}
            <label className="text-overline font-mono uppercase tracking-[0.2em] text-[#121110]/60 flex justify-between items-center">
              {" "}
              <span className="flex items-center gap-2">
                {" "}
                <AlignLeft className="w-3 h-3" />{" "}
                {t("System Prompt", "系统提示词")}{" "}
              </span>{" "}
            </label>{" "}
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder={t(
                "Enter system instructions...",
                "输入系统提示词...",
              )}
              className="w-full bg-white border border-[#121110]/15 hover:border-[#121110]/30 focus:border-[#121110] transition-colors p-4 text-label text-[#121110] outline-none resize-none min-h-[140px] rounded-none placeholder:text-[#121110]/30 leading-relaxed shadow-sm"
            />{" "}
          </div>{" "}
          <div className="h-px w-full bg-inverse/5" />{" "}
          {/* Temperature Slider */}{" "}
          <div className="space-y-5">
            {" "}
            <div className="flex items-center justify-between">
              {" "}
              <label className="text-overline font-mono uppercase tracking-[0.2em] text-[#121110]/60">
                {" "}
                {t("Temperature", "创造力温度")}{" "}
              </label>{" "}
              <span className="text-micro font-mono text-[#121110] px-2 py-0.5 bg-white border border-[#121110]/10 shadow-sm">
                {temperature.toFixed(2)}
              </span>{" "}
            </div>{" "}
            <input
              type="range"
              min="0"
              max="2"
              step="0.01"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full h-1 bg-inverse/10 rounded-none appearance-none cursor-pointer accent-[#121110]"
            />{" "}
            <div className="flex justify-between text-[9px] font-mono uppercase tracking-widest text-[#121110]/30">
              {" "}
              <span>Precise</span> <span>Creative</span>{" "}
            </div>{" "}
          </div>{" "}
          {/* Max Tokens Slider */}{" "}
          <div className="space-y-5">
            {" "}
            <div className="flex items-center justify-between">
              {" "}
              <label className="text-overline font-mono uppercase tracking-[0.2em] text-[#121110]/60">
                {" "}
                {t("Max Tokens", "最大令牌数")}{" "}
              </label>{" "}
              <span className="text-micro font-mono text-[#121110] px-2 py-0.5 bg-white border border-[#121110]/10 shadow-sm">
                {maxTokens}
              </span>{" "}
            </div>{" "}
            <input
              type="range"
              min="1"
              max="4096"
              step="1"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value))}
              className="w-full h-1 bg-inverse/10 rounded-none appearance-none cursor-pointer accent-[#121110]"
            />{" "}
            <div className="flex justify-between text-[9px] font-mono uppercase tracking-widest text-[#121110]/30">
              {" "}
              <span>Short</span> <span>Long</span>{" "}
            </div>{" "}
          </div>{" "}
          {/* Top P Slider */}{" "}
          <div className="space-y-5">
            {" "}
            <div className="flex items-center justify-between">
              {" "}
              <label className="text-overline font-mono uppercase tracking-[0.2em] text-[#121110]/60">
                {" "}
                {t("Top P", "采样阈值")}{" "}
              </label>{" "}
              <span className="text-micro font-mono text-[#121110] px-2 py-0.5 bg-white border border-[#121110]/10 shadow-sm">
                {topP.toFixed(2)}
              </span>{" "}
            </div>{" "}
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={topP}
              onChange={(e) => setTopP(parseFloat(e.target.value))}
              className="w-full h-1 bg-inverse/10 rounded-none appearance-none cursor-pointer accent-[#121110]"
            />{" "}
          </div>{" "}
          <div className="h-px w-full bg-inverse/5" />{" "}
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <label className="text-overline font-mono uppercase tracking-[0.2em] text-[#121110]/60">
                {t("Frequency Penalty", "频率惩罚")}
              </label>
              <span className="text-micro font-mono text-[#121110] px-2 py-0.5 bg-white border border-[#121110]/10 shadow-sm">
                {frequencyPenalty.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="-2"
              max="2"
              step="0.05"
              value={frequencyPenalty}
              onChange={(e) => setFrequencyPenalty(parseFloat(e.target.value))}
              className="w-full h-1 bg-inverse/10 rounded-none appearance-none cursor-pointer accent-[#121110]"
            />
            <div className="flex items-center justify-between">
              <label className="text-overline font-mono uppercase tracking-[0.2em] text-[#121110]/60">
                {t("Presence Penalty", "存在惩罚")}
              </label>
              <span className="text-micro font-mono text-[#121110] px-2 py-0.5 bg-white border border-[#121110]/10 shadow-sm">
                {presencePenalty.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="-2"
              max="2"
              step="0.05"
              value={presencePenalty}
              onChange={(e) => setPresencePenalty(parseFloat(e.target.value))}
              className="w-full h-1 bg-inverse/10 rounded-none appearance-none cursor-pointer accent-[#121110]"
            />
          </div>{" "}
          <div className="space-y-4">
            <label className="text-overline font-mono uppercase tracking-[0.2em] text-[#121110]/60">
              {t("Stop Sequences", "停止词")}
            </label>
            <input
              value={stopSequences}
              onChange={(e) => setStopSequences(e.target.value)}
              placeholder={t("Separate with commas", "用逗号或换行分隔")}
              className="w-full bg-white border border-[#121110]/15 hover:border-[#121110]/30 focus:border-[#121110] transition-colors p-3 text-label text-[#121110] outline-none rounded-none placeholder:text-[#121110]/30"
            />
          </div>{" "}
          <div className="space-y-4">
            <label className="text-overline font-mono uppercase tracking-[0.2em] text-[#121110]/60">
              {t("Response Format", "响应格式")}
            </label>
            <SelectMenu value={responseFormat} onChange={(value) => setResponseFormat(value as "text" | "json_object")} options={[{ value: "text", label: t("Text", "文本") }, { value: "json_object", label: "JSON object" }]} />
          </div>{" "}
        </div>{" "}
        {/* Footer Actions */}{" "}
        <div className="p-6 border-t border-[#121110]/10 bg-white/50 shrink-0 space-y-3">
          {" "}
          <button
            onClick={clearActiveSession}
            className="w-full bg-transparent border border-[#121110]/20 text-[#121110] py-3 text-micro font-mono uppercase tracking-widest hover:border-[#121110] hover:bg-inverse/5 transition-colors rounded-none"
          >
            {" "}
            {t("Clear Session", "清除会话")}{" "}
          </button>{" "}
          <button
            onClick={createSession}
            className="w-full bg-inverse text-white py-3 text-micro font-mono uppercase tracking-widest hover:bg-black transition-colors rounded-none"
          >
            {t("New Session", "新会话")}
          </button>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
