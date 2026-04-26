import { Check, Copy, FileText, Pencil, RefreshCw, Sparkles, User, Volume2, VolumeX } from "lucide-react";
import type { ChatMessage } from "@/lib/chat-storage";
import { Markdown } from "./Markdown";
import { cn } from "@/lib/utils";
import { useState } from "react";

type Props = {
  message: ChatMessage;
  streaming?: boolean;
  onRegenerate?: () => void;
  onEdit?: (newText: string) => void;
  onSpeak?: () => void;
  onStopSpeak?: () => void;
  speaking?: boolean;
};

export function MessageBubble({
  message,
  streaming,
  onRegenerate,
  onEdit,
  onSpeak,
  onStopSpeak,
  speaking,
}: Props) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);

  const copy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="animate-fade-up flex w-full gap-3 px-4 py-5">
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          isUser
            ? "bg-secondary text-secondary-foreground"
            : "bg-[var(--gradient-primary)] text-primary-foreground glow",
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          {isUser ? "You" : "Nova"}
        </div>

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {message.attachments.map((a, i) =>
              a.kind === "image" ? (
                <img
                  key={i}
                  src={a.dataUrl}
                  alt={a.name}
                  className="max-h-44 rounded-lg border border-border object-cover"
                />
              ) : (
                <div key={i} className="glass flex items-center gap-2 rounded-lg px-3 py-2 text-xs">
                  <FileText className="h-4 w-4 text-primary-glow" />
                  <span className="max-w-[200px] truncate">{a.name}</span>
                </div>
              ),
            )}
          </div>
        )}

        {message.imageUrl && (
          <img
            src={message.imageUrl}
            alt="Generated"
            className="mb-3 max-w-md rounded-xl border border-border shadow-elegant"
          />
        )}

        {editing ? (
          <div className="space-y-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={Math.min(10, draft.split("\n").length + 1)}
              className="w-full resize-none rounded-lg border border-border bg-card p-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  onEdit?.(draft.trim());
                  setEditing(false);
                }}
                className="rounded-lg bg-[var(--gradient-primary)] px-3 py-1.5 text-xs font-medium text-primary-foreground glow"
              >
                Send
              </button>
              <button
                onClick={() => {
                  setDraft(message.content);
                  setEditing(false);
                }}
                className="rounded-lg bg-secondary px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : message.content ? (
          <Markdown content={message.content} />
        ) : streaming ? (
          <div className="flex gap-1.5 py-2">
            <span className="typing-dot h-2 w-2 rounded-full bg-primary" />
            <span className="typing-dot h-2 w-2 rounded-full bg-primary" style={{ animationDelay: "0.15s" }} />
            <span className="typing-dot h-2 w-2 rounded-full bg-primary" style={{ animationDelay: "0.3s" }} />
          </div>
        ) : null}

        {/* Action row */}
        {!editing && message.content && !streaming && (
          <div className="mt-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 hover:opacity-100">
            <ActionBtn onClick={copy} label={copied ? "Copied" : "Copy"}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </ActionBtn>
            {!isUser && onSpeak && (
              <ActionBtn
                onClick={speaking ? onStopSpeak! : onSpeak}
                label={speaking ? "Stop" : "Read aloud"}
              >
                {speaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              </ActionBtn>
            )}
            {!isUser && onRegenerate && (
              <ActionBtn onClick={onRegenerate} label="Regenerate">
                <RefreshCw className="h-3.5 w-3.5" />
              </ActionBtn>
            )}
            {isUser && onEdit && (
              <ActionBtn onClick={() => setEditing(true)} label="Edit">
                <Pencil className="h-3.5 w-3.5" />
              </ActionBtn>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionBtn({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
