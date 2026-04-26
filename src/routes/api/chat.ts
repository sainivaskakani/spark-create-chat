import { createFileRoute } from "@tanstack/react-router";

type Part =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type IncomingMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  // Optional multimodal extras from client
  images?: string[]; // data URLs
  pdfText?: string;
};

const SYSTEM_PROMPT = `You are Nova — a next-generation multimodal AI assistant.
- Be precise, helpful, and conversational.
- Format answers with Markdown: headings, lists, **bold**, tables, and fenced code blocks with language tags.
- When the user attaches a PDF, treat the provided extracted text as authoritative source material and cite page numbers when present.
- When the user attaches images, analyze them carefully and describe what you see.
- Break complex problems into steps. Show reasoning briefly when useful.
- For code: provide complete, runnable examples and explain key parts.`;

function toGatewayMessages(messages: IncomingMessage[]) {
  return messages.map((m) => {
    const hasImages = m.images && m.images.length > 0;
    const hasPdf = !!m.pdfText;
    if (m.role !== "user" || (!hasImages && !hasPdf)) {
      return { role: m.role, content: m.content };
    }
    const parts: Part[] = [];
    let text = m.content || "";
    if (hasPdf) {
      text =
        `The user attached a PDF. Extracted text follows between <pdf> tags.\n` +
        `<pdf>\n${m.pdfText}\n</pdf>\n\n` +
        (text || "Please summarize the document and answer questions about it.");
    }
    parts.push({ type: "text", text });
    if (hasImages) {
      for (const url of m.images!) parts.push({ type: "image_url", image_url: { url } });
    }
    return { role: m.role, content: parts };
  });
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { messages, mode } = (await request.json()) as {
            messages: IncomingMessage[];
            mode?: "chat" | "image";
          };

          const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
          if (!LOVABLE_API_KEY) {
            return new Response(
              JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }

          // Image generation
          if (mode === "image") {
            const lastUser = [...messages].reverse().find((m) => m.role === "user");
            const prompt = lastUser?.content ?? "A beautiful abstract artwork";
            const refImages = lastUser?.images ?? [];

            const userContent: Part[] = [{ type: "text", text: prompt }];
            for (const url of refImages) userContent.push({ type: "image_url", image_url: { url } });

            const imgRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash-image",
                messages: [{ role: "user", content: userContent }],
                modalities: ["image", "text"],
              }),
            });

            if (!imgRes.ok) {
              if (imgRes.status === 429)
                return new Response(JSON.stringify({ error: "Rate limit reached. Please wait a moment." }), { status: 429, headers: { "Content-Type": "application/json" } });
              if (imgRes.status === 402)
                return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Settings → Workspace → Usage." }), { status: 402, headers: { "Content-Type": "application/json" } });
              const t = await imgRes.text();
              return new Response(JSON.stringify({ error: `Image gen failed: ${t}` }), { status: 500, headers: { "Content-Type": "application/json" } });
            }

            const data = await imgRes.json();
            const imageUrl: string | undefined = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
            const text: string = data?.choices?.[0]?.message?.content ?? "Here's your image.";
            return new Response(JSON.stringify({ imageUrl, text, prompt }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }

          // Streaming chat (multimodal aware)
          const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                { role: "system", content: SYSTEM_PROMPT },
                ...toGatewayMessages(messages),
              ],
              stream: true,
            }),
          });

          if (!upstream.ok || !upstream.body) {
            if (upstream.status === 429)
              return new Response(JSON.stringify({ error: "Rate limit reached. Please wait a moment." }), { status: 429, headers: { "Content-Type": "application/json" } });
            if (upstream.status === 402)
              return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Settings → Workspace → Usage." }), { status: 402, headers: { "Content-Type": "application/json" } });
            const t = await upstream.text();
            return new Response(JSON.stringify({ error: `AI gateway error: ${t}` }), { status: 500, headers: { "Content-Type": "application/json" } });
          }

          return new Response(upstream.body, {
            headers: { "Content-Type": "text/event-stream" },
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Unknown error";
          return new Response(JSON.stringify({ error: msg }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
