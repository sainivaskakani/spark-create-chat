import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Menu, Sparkles, Square } from "lucide-react";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { useChatStream } from "@/hooks/use-chat-stream";
import {
  type ChatMessage,
  type Conversation,
  deriveTitle,
  loadConversations,
  newConversation,
  saveConversations,
} from "@/lib/chat-storage";

export const Route = createFileRoute("/")({
  component: ChatPage,
  head: () => ({
    meta: [
      { title: "Nova — Next-Gen AI Assistant" },
      {
        name: "description",
        content:
          "Nova is a next-generation multimodal AI chatbot. Stream answers, generate images, and code with confidence.",
      },
      { property: "og:title", content: "Nova — Next-Gen AI Assistant" },
      {
        property: "og:description",
        content: "Streaming chat, image generation, and rich markdown — powered by Lovable AI.",
      },
    ],
  }),
});

function EmptyState({ onPick }: { onPick: (s: string) => void }) {
  const suggestions = [
    "Explain quantum entanglement like I'm 12",
    "Write a Python script to merge CSV files",
    "Plan a 3-day Tokyo itinerary",
    "Compare Postgres vs SQLite for a SaaS MVP",
  ];
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--gradient-primary)] glow">
        <Sparkles className="h-7 w-7 text-primary-foreground" />
      </div>
      <h1 className="mt-5 font-display text-3xl font-bold tracking-tight md:text-4xl">
        Meet <span className="gradient-text">Nova</span>
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        A next-gen multimodal assistant. Ask anything, generate images, write code, plan, and learn.
      </p>
      <div className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="glass rounded-xl px-4 py-3 text-left text-sm text-foreground/90 transition-all hover:glow hover:text-foreground"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isStreaming, stream, generateImage, stop } = useChatStream();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load + persist
  useEffect(() => {
    const loaded = loadConversations();
    if (loaded.length) {
      setConversations(loaded);
      setActiveId(loaded[0].id);
    } else {
      const c = newConversation();
      setConversations([c]);
      setActiveId(c.id);
    }
  }, []);

  useEffect(() => {
    if (conversations.length) saveConversations(conversations);
  }, [conversations]);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [active?.messages]);

  const updateActive = (updater: (c: Conversation) => Conversation) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === activeId ? updater(c) : c)),
    );
  };

  const handleNew = () => {
    const c = newConversation();
    setConversations((prev) => [c, ...prev]);
    setActiveId(c.id);
    setSidebarOpen(false);
    setError(null);
  };

  const handleDelete = (id: string) => {
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (id === activeId) {
        setActiveId(next[0]?.id ?? null);
        if (!next.length) {
          const c = newConversation();
          setActiveId(c.id);
          return [c];
        }
      }
      return next;
    });
  };

  const handleSelect = (id: string) => {
    setActiveId(id);
    setSidebarOpen(false);
    setError(null);
  };

  const handleSend = async (text: string, mode: "chat" | "image") => {
    if (!active) return;
    setError(null);

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      createdAt: Date.now(),
    };

    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      createdAt: Date.now(),
    };

    const isFirst = active.messages.length === 0;

    updateActive((c) => ({
      ...c,
      title: isFirst ? deriveTitle(text) : c.title,
      messages: [...c.messages, userMsg, assistantMsg],
      updatedAt: Date.now(),
    }));

    const history = [
      ...active.messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: text },
    ];

    if (mode === "image") {
      const res = await generateImage(history);
      if ("error" in res) {
        setError(res.error);
        updateActive((c) => ({
          ...c,
          messages: c.messages.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: `⚠️ ${res.error}` }
              : m,
          ),
        }));
        return;
      }
      updateActive((c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.id === assistantMsg.id
            ? { ...m, content: res.text, imageUrl: res.imageUrl }
            : m,
        ),
      }));
      return;
    }

    let acc = "";
    await stream(
      history,
      (delta) => {
        acc += delta;
        updateActive((c) => ({
          ...c,
          messages: c.messages.map((m) =>
            m.id === assistantMsg.id ? { ...m, content: acc } : m,
          ),
        }));
      },
      (err) => {
        setError(err);
        updateActive((c) => ({
          ...c,
          messages: c.messages.map((m) =>
            m.id === assistantMsg.id ? { ...m, content: `⚠️ ${err}` } : m,
          ),
        }));
      },
    );
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <ChatSidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={handleSelect}
        onNew={handleNew}
        onDelete={handleDelete}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border/60 px-3 py-2.5 md:px-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground md:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="font-display text-sm font-medium text-muted-foreground">
              {active?.title ?? "New chat"}
            </div>
          </div>
          {isStreaming && (
            <button
              onClick={stop}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs text-foreground hover:bg-muted"
            >
              <Square className="h-3 w-3" /> Stop
            </button>
          )}
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {!active || active.messages.length === 0 ? (
            <div className="h-full">
              <EmptyState onPick={(s) => handleSend(s, "chat")} />
            </div>
          ) : (
            <div className="mx-auto w-full max-w-3xl">
              {active.messages.map((m, idx) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  streaming={isStreaming && idx === active.messages.length - 1 && m.role === "assistant"}
                />
              ))}
              {error && (
                <div className="mx-4 mb-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        <ChatInput onSend={handleSend} disabled={isStreaming} />
      </main>
    </div>
  );
}
