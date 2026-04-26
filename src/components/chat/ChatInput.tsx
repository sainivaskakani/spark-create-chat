import { useEffect, useRef, useState } from "react";
import { ArrowUp, Image as ImageIcon, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  onSend: (text: string, mode: "chat" | "image") => void;
  disabled?: boolean;
};

export function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState("");
  const [mode, setMode] = useState<"chat" | "image">("chat");
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 220) + "px";
  }, [value]);

  const submit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text, mode);
    setValue("");
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-4">
      <div className="glass shadow-elegant rounded-2xl">
        <div className="flex items-end gap-2 p-2">
          <button
            type="button"
            onClick={() => setMode((m) => (m === "chat" ? "image" : "chat"))}
            title={mode === "image" ? "Image mode (click to switch to chat)" : "Switch to image generation"}
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all",
              mode === "image"
                ? "bg-[var(--gradient-primary)] text-primary-foreground glow"
                : "bg-secondary text-muted-foreground hover:text-foreground",
            )}
          >
            <ImageIcon className="h-4 w-4" />
          </button>

          <textarea
            ref={taRef}
            rows={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={
              mode === "image"
                ? "Describe an image to generate…"
                : "Ask Nova anything — code, ideas, analysis…"
            }
            className="flex-1 resize-none bg-transparent px-2 py-2.5 text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none"
          />

          <button
            type="button"
            disabled={disabled || !value.trim()}
            onClick={submit}
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all",
              value.trim() && !disabled
                ? "bg-[var(--gradient-primary)] text-primary-foreground glow hover:scale-105"
                : "bg-secondary text-muted-foreground",
            )}
            aria-label="Send"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        {mode === "image" ? (
          <>
            <Sparkles className="mr-1 inline h-3 w-3" />
            Image mode · Nano Banana
          </>
        ) : (
          "Nova may make mistakes. Verify important info."
        )}
      </p>
    </div>
  );
}
