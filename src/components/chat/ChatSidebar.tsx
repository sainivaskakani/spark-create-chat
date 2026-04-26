import { Plus, MessageSquare, Trash2, Sparkles, X, Search, Download, Sun, Moon } from "lucide-react";
import type { Conversation } from "@/lib/chat-storage";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

type Props = {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onExport: () => void;
  onToggleTheme: () => void;
  theme: "dark" | "light";
  open: boolean;
  onClose: () => void;
};

export function ChatSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onExport,
  onToggleTheme,
  theme,
  open,
  onClose,
}: Props) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!q.trim()) return conversations;
    const term = q.toLowerCase();
    return conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(term) ||
        c.messages.some((m) => m.content.toLowerCase().includes(term)),
    );
  }, [q, conversations]);

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-30 bg-background/60 backdrop-blur-sm transition-opacity md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-sidebar-border bg-sidebar transition-transform md:relative md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-sidebar-border p-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--gradient-primary)] glow">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-base font-semibold tracking-tight">Nova</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onToggleTheme}
              className="rounded-md p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent"
              aria-label="Toggle theme"
              title="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent md:hidden"
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-2 p-3">
          <button
            onClick={onNew}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-sidebar-border bg-sidebar-accent/40 px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:glow"
          >
            <Plus className="h-4 w-4" />
            New chat
          </button>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-sidebar-foreground/50" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search chats…"
              className="w-full rounded-lg border border-sidebar-border bg-sidebar-accent/30 py-1.5 pl-8 pr-2 text-xs text-sidebar-foreground placeholder:text-sidebar-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-sidebar-foreground/50">
              {q ? "No matches." : "Your conversations will appear here."}
            </p>
          ) : (
            <ul className="space-y-0.5">
              {filtered.map((c) => {
                const isActive = c.id === activeId;
                return (
                  <li key={c.id}>
                    <div
                      className={cn(
                        "group flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-foreground"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60",
                      )}
                    >
                      <button
                        onClick={() => onSelect(c.id)}
                        className="flex flex-1 items-center gap-2 truncate text-left"
                      >
                        <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-70" />
                        <span className="truncate">{c.title}</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(c.id);
                        }}
                        className="rounded p-1 opacity-0 transition-opacity hover:bg-destructive/20 hover:text-destructive group-hover:opacity-100"
                        aria-label="Delete conversation"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-sidebar-border p-3">
          <button
            onClick={onExport}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-sidebar-accent/40 py-2 text-xs text-sidebar-foreground/80 hover:bg-sidebar-accent"
          >
            <Download className="h-3.5 w-3.5" /> Export current chat
          </button>
          <p className="mt-2 text-center text-[11px] text-sidebar-foreground/50">
            Powered by Lovable AI
          </p>
        </div>
      </aside>
    </>
  );
}
