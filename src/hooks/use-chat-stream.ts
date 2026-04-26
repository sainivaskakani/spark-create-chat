import { useCallback, useRef, useState } from "react";

type Msg = { role: "user" | "assistant" | "system"; content: string };

export function useChatStream() {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const stream = useCallback(
    async (
      messages: Msg[],
      onDelta: (text: string) => void,
      onError: (err: string) => void,
    ) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setIsStreaming(true);

      try {
        const resp = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages }),
          signal: controller.signal,
        });

        if (!resp.ok || !resp.body) {
          let msg = `Request failed (${resp.status})`;
          try {
            const j = await resp.json();
            if (j?.error) msg = j.error;
          } catch {}
          onError(msg);
          return;
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let done = false;

        while (!done) {
          const { done: d, value } = await reader.read();
          if (d) break;
          buffer += decoder.decode(value, { stream: true });

          let nl: number;
          while ((nl = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, nl);
            buffer = buffer.slice(nl + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line || line.startsWith(":")) continue;
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6).trim();
            if (json === "[DONE]") {
              done = true;
              break;
            }
            try {
              const parsed = JSON.parse(json);
              const content: string | undefined = parsed?.choices?.[0]?.delta?.content;
              if (content) onDelta(content);
            } catch {
              buffer = line + "\n" + buffer;
              break;
            }
          }
        }
      } catch (e) {
        if ((e as any)?.name !== "AbortError") {
          onError(e instanceof Error ? e.message : "Stream error");
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [],
  );

  const generateImage = useCallback(
    async (
      messages: Msg[],
    ): Promise<{ imageUrl?: string; text: string } | { error: string }> => {
      const controller = new AbortController();
      abortRef.current = controller;
      setIsStreaming(true);
      try {
        const resp = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages, mode: "image" }),
          signal: controller.signal,
        });
        const data = await resp.json();
        if (!resp.ok) return { error: data?.error ?? "Image generation failed" };
        return { imageUrl: data.imageUrl, text: data.text ?? "Here's your image." };
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Image error" };
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [],
  );

  return { isStreaming, stream, generateImage, stop };
}
