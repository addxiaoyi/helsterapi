import { useCallback, useEffect, useState } from "react";
import { MessageSquare, Trash2, X, ChevronRight, Cpu, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PageContainer } from "../../components/ui/PageContainer";
import { useLang } from "../../lib/LanguageContext";

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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, SESSION_LIMIT)));
  } catch {
    /* storage may be full or disabled */
  }
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleString();
}

function truncate(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "…";
}

function getFirstUserMessage(messages: Message[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "—";
  return truncate(firstUser.content.replace(/\s+/g, " ").trim(), 80);
}

const PAGE_SIZE = 20;

export default function ChatHistory() {
  const { t } = useLang();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [page, setPage] = useState(1);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const load = useCallback(() => {
    setIsLoading(true);
    const items = loadSessions();
    setSessions(items);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(sessions.length / PAGE_SIZE));
  const paginated = sessions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function deleteSession(id: string) {
    setSessions((current) => {
      const filtered = current.filter((s) => s.id !== id);
      persistSessions(filtered);
      if (selectedSession?.id === id) setSelectedSession(null);
      return filtered;
    });
    setConfirmDeleteId(null);
  }

  return (
    <PageContainer
      title={t("Chat History", "会话记录")}
      subtitle={t(
        "Browse and manage your past chat sessions.",
        "浏览和管理您过往的会话记录。",
      )}
      isLoading={isLoading}
    >
      {sessions.length === 0 ? (
        <div className="border border-[#121110]/10 bg-white p-16 text-center">
          <MessageSquare className="mx-auto mb-4 h-10 w-10 text-muted" />
          <p className="font-serif text-lg text-muted">
            {t("No sessions yet.", "暂无会话记录。")}
          </p>
          <p className="mt-2 text-[12px] text-muted">
            {t(
              "Start chatting in the Playground to create sessions.",
              "在游乐场开始聊天以创建会话。",
            )}
          </p>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="border border-[#121110]/10 bg-white">
            {/* Header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-0 border-b border-[#121110]/10 bg-primary">
              {[
                t("Date / Title", "日期 / 标题"),
                t("Model", "模型"),
                t("Messages", "消息数"),
                t("Preview", "预览"),
                t("Actions", "操作"),
              ].map((col) => (
                <div
                  key={col}
                  className="px-5 py-3 text-overline font-mono uppercase tracking-widest text-muted"
                >
                  {col}
                </div>
              ))}
            </div>

            {/* Rows */}
            {paginated.map((session) => (
              <div
                key={session.id}
                className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-0 border-b border-[#121110]/5 last:border-0 hover:bg-primary/60 transition-colors group"
              >
                {/* Date + Title */}
                <button
                  type="button"
                  onClick={() => setSelectedSession(session)}
                  className="flex flex-col gap-0.5 px-5 py-4 text-left hover:text-[#121110] transition-colors"
                >
                  <span className="text-micro font-mono text-muted">
                    {formatDate(session.createdAt)}
                  </span>
                  <span className="mt-1 font-serif text-label text-[#121110]">
                    {session.title || t("Untitled session", "无标题会话")}
                  </span>
                </button>

                {/* Model */}
                <div className="px-5 py-4">
                  <span className="font-mono text-caption text-[#121110]">
                    {session.model
                      ? session.model.toUpperCase()
                      : "—"}
                  </span>
                </div>

                {/* Message count */}
                <div className="px-5 py-4">
                  <span className="font-mono text-caption text-muted">
                    {session.messages.length}
                  </span>
                </div>

                {/* Preview */}
                <div className="max-w-xs px-5 py-4">
                  <span className="text-caption text-muted leading-relaxed">
                    {getFirstUserMessage(session.messages)}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 px-5 py-4">
                  <button
                    type="button"
                    onClick={() => setSelectedSession(session)}
                    title={t("View session", "查看会话")}
                    className="flex items-center gap-1 border border-[#121110]/10 px-2 py-1 text-overline font-mono uppercase tracking-widest text-muted hover:border-[#121110] hover:text-[#121110] transition-colors"
                  >
                    <ChevronRight className="h-3 w-3" />
                    {t("View", "查看")}
                  </button>
                  {confirmDeleteId === session.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => deleteSession(session.id)}
                        className="border border-red-900/40 bg-red-50 px-2 py-1 text-overline font-mono uppercase tracking-widest text-red-700 hover:bg-red-100 transition-colors"
                      >
                        {t("Confirm", "确认")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="border border-[#121110]/10 px-2 py-1 text-overline font-mono uppercase tracking-widest text-muted hover:text-[#121110] transition-colors"
                      >
                        {t("Cancel", "取消")}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(session.id)}
                      title={t("Delete session", "删除会话")}
                      className="text-muted hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-micro font-mono text-muted">
                {t(`Page ${page} of ${totalPages}`, `第 ${page} 页，共 ${totalPages} 页`)}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="border border-[#121110]/10 px-3 py-1.5 text-overline font-mono uppercase tracking-widest text-muted hover:border-[#121110] hover:text-[#121110] disabled:opacity-30 transition-colors"
                >
                  {t("Prev", "上一页")}
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="border border-[#121110]/10 px-3 py-1.5 text-overline font-mono uppercase tracking-widest text-muted hover:border-[#121110] hover:text-[#121110] disabled:opacity-30 transition-colors"
                >
                  {t("Next", "下一页")}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Session Detail Slide-out Panel */}
      {selectedSession && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setSelectedSession(null)}
          />

          {/* Panel */}
          <aside className="fixed right-0 top-0 z-50 flex h-full w-full flex-col bg-inverse text-[#FAFAFA] shadow-drawer sm:w-[36rem]">
            {/* Panel Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-[#FAFAFA]/10 px-6 py-4">
              <div>
                <h3 className="font-serif text-[16px]">
                  {selectedSession.title || t("Untitled session", "无标题会话")}
                </h3>
                <p className="mt-1 text-overline font-mono uppercase tracking-widest text-[#FAFAFA]/50">
                  {formatDate(selectedSession.createdAt)}
                  {selectedSession.model && (
                    <>
                      {" "}
                      &middot;{" "}
                      <span className="uppercase">{selectedSession.model}</span>
                    </>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSession(null)}
                className="text-[#FAFAFA]/50 hover:text-[#FAFAFA] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Message List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
              {selectedSession.messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  {msg.role !== "system" && (
                    <div
                      className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center border ${
                        msg.role === "user"
                          ? "border-[#FAFAFA]/20 text-[#FAFAFA]"
                          : "border-[#FAFAFA]/10 text-[#FAFAFA]/70"
                      }`}
                    >
                      {msg.role === "user" ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Cpu className="h-4 w-4" />
                      )}
                    </div>
                  )}
                  <div
                    className={`flex-1 text-label leading-relaxed ${
                      msg.role === "system"
                        ? "font-mono text-caption uppercase tracking-widest text-[#FAFAFA]/30"
                        : ""
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none prose-invert prose-p:leading-relaxed prose-pre:rounded-none prose-pre:bg-white/5 prose-pre:text-[#FAFAFA] prose-pre:border prose-pre:border-white/10 prose-code:text-[#FAFAFA] prose-code:bg-white/5 prose-code:px-1 prose-code:py-0.5 prose-headings:font-serif prose-a:text-[#FAFAFA] prose-a:underline">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <span className="whitespace-pre-wrap">{msg.content}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Panel Footer */}
            <div className="shrink-0 border-t border-[#FAFAFA]/10 p-4">
              {confirmDeleteId === selectedSession.id ? (
                <div className="flex items-center gap-3">
                  <p className="flex-1 text-caption text-[#FAFAFA]/50">
                    {t("Delete this session permanently?", "确定永久删除此会话？")}
                  </p>
                  <button
                    type="button"
                    onClick={() => deleteSession(selectedSession.id)}
                    className="border border-red-500/40 bg-red-500/10 px-4 py-2 text-overline font-mono uppercase tracking-widest text-red-400 hover:bg-red-500/20 transition-colors"
                  >
                    {t("Delete", "删除")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    className="border border-[#FAFAFA]/20 px-4 py-2 text-overline font-mono uppercase tracking-widest text-[#FAFAFA]/50 hover:text-[#FAFAFA] hover:border-[#FAFAFA]/40 transition-colors"
                  >
                    {t("Cancel", "取消")}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(selectedSession.id)}
                  className="flex w-full items-center justify-center gap-2 border border-[#FAFAFA]/10 py-2.5 text-overline font-mono uppercase tracking-widest text-[#FAFAFA]/50 hover:border-red-500/40 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t("Delete Session", "删除会话")}
                </button>
              )}
            </div>
          </aside>
        </>
      )}
    </PageContainer>
  );
}
