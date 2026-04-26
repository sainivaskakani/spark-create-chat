import { useEffect, useRef, useState } from "react";
import { ArrowUp, Image as ImageIcon, Mic, MicOff, Paperclip, Sparkles, X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSpeechRecognition } from "@/hooks/use-speech";
import { extractPdfText, fileToDataUrl } from "@/lib/pdf-extract";
import type { Attachment } from "@/lib/chat-storage";

type Props = {
  onSend: (text: string, mode: "chat" | "image", attachments: Attachment[]) => void;
  disabled?: boolean;
};

export function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState("");
  const [mode, setMode] = useState<"chat" | "image">("chat");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [parsing, setParsing] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const speech = useSpeechRecognition();

  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 220) + "px";
  }, [value]);

  // Pull live transcript into the textarea
  useEffect(() => {
    if (speech.transcript) setValue((v) => (v ? v + " " : "") + speech.transcript);
    if (speech.transcript) speech.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.transcript]);

  // Cmd/Ctrl+K focus
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        taRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const submit = () => {
    const text = (value + (speech.interim ? " " + speech.interim : "")).trim();
    if ((!text && attachments.length === 0) || disabled) return;
    if (speech.listening) speech.stop();
    onSend(text, mode, attachments);
    setValue("");
    setAttachments([]);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setParsing(true);
    const next: Attachment[] = [];
    for (const f of Array.from(files)) {
      try {
        if (f.type.startsWith("image/")) {
          const dataUrl = await fileToDataUrl(f);
          next.push({ kind: "image", name: f.name, dataUrl, size: f.size });
        } else if (f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")) {
          const text = await extractPdfText(f);
          next.push({ kind: "pdf", name: f.name, text, size: f.size });
        }
      } catch (err) {
        console.error("Attachment failed", err);
      }
    }
    setAttachments((a) => [...a, ...next]);
    setParsing(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeAt = (i: number) =>
    setAttachments((a) => a.filter((_, idx) => idx !== i));

  return (
    <div
      className="mx-auto w-full max-w-3xl px-4 pb-4"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        handleFiles(e.dataTransfer.files);
      }}
    >
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((a, i) => (
            <div key={i} className="glass flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs">
              {a.kind === "image" ? (
                <img src={a.dataUrl} alt="" className="h-8 w-8 rounded-md object-cover" />
              ) : (
                <FileText className="h-4 w-4 text-primary-glow" />
              )}
              <span className="max-w-[160px] truncate text-foreground/90">{a.name}</span>
              <button
                onClick={() => removeAt(i)}
                className="rounded-md p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="Remove"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {parsing && <span className="text-xs text-muted-foreground">Parsing…</span>}
        </div>
      )}

      <div className="glass shadow-elegant rounded-2xl">
        <div className="flex items-end gap-1.5 p-2">
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

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            title="Attach image or PDF"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground transition-all hover:text-foreground"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf,.pdf"
            multiple
            hidden
            onChange={(e) => handleFiles(e.target.files)}
          />

          {speech.supported && (
            <button
              type="button"
              onClick={() => (speech.listening ? speech.stop() : speech.start())}
              title={speech.listening ? "Stop dictation" : "Start dictation"}
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all",
                speech.listening
                  ? "bg-destructive text-destructive-foreground glow"
                  : "bg-secondary text-muted-foreground hover:text-foreground",
              )}
            >
              {speech.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
          )}

          <textarea
            ref={taRef}
            rows={1}
            value={value + (speech.interim ? " " + speech.interim : "")}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={
              speech.listening
                ? "Listening… speak now"
                : mode === "image"
                  ? "Describe an image to generate…"
                  : "Ask Nova anything — attach PDFs/images, or press the mic"
            }
            className="flex-1 resize-none bg-transparent px-2 py-2.5 text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none"
          />

          <button
            type="button"
            disabled={disabled || (!value.trim() && attachments.length === 0)}
            onClick={submit}
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all",
              (value.trim() || attachments.length) && !disabled
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
          <>Enter to send · Shift+Enter for newline · ⌘K to focus</>
        )}
      </p>
    </div>
  );
}
