export type ChatRole = "user" | "assistant" | "system";

export type Attachment = {
  kind: "image" | "pdf";
  name: string;
  // For images: data URL (preview + sent to model)
  // For PDFs: omitted (we only keep extracted text)
  dataUrl?: string;
  // Extracted text snippet (PDFs)
  text?: string;
  size?: number;
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  imageUrl?: string;
  attachments?: Attachment[];
  createdAt: number;
};

export type Conversation = {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
};

const KEY = "nova-conversations-v1";

export function loadConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Conversation[];
  } catch {
    return [];
  }
}

export function saveConversations(convs: Conversation[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(convs));
  } catch {
    /* quota — ignore */
  }
}

export function newConversation(): Conversation {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: "New chat",
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function deriveTitle(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > 48 ? t.slice(0, 48) + "…" : t || "New chat";
}
