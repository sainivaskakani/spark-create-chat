import { Sparkles, User } from "lucide-react";
import type { ChatMessage } from "@/lib/chat-storage";
import { Markdown } from "./Markdown";
import { cn } from "@/lib/utils";

export function MessageBubble({ message, streaming }: { message: ChatMessage; streaming?: boolean }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("animate-fade-up flex w-full gap-3 px-4 py-5", isUser ? "" : "")}>
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
        <div className="mb-1 text-xs font-medium text-muted-foreground">
          {isUser ? "You" : "Nova"}
        </div>
        {message.imageUrl && (
          <img
            src={message.imageUrl}
            alt="Generated"
            className="mb-3 max-w-md rounded-xl border border-border shadow-elegant"
          />
        )}
        {message.content ? (
          <Markdown content={message.content} />
        ) : streaming ? (
          <div className="flex gap-1.5 py-2">
            <span className="typing-dot h-2 w-2 rounded-full bg-primary" />
            <span className="typing-dot h-2 w-2 rounded-full bg-primary" style={{ animationDelay: "0.15s" }} />
            <span className="typing-dot h-2 w-2 rounded-full bg-primary" style={{ animationDelay: "0.3s" }} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
