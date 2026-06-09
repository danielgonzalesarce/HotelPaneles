import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { ChatMessage, KnowledgeEntry } from "./receptionist-types.js";

let db: SupabaseClient | null = null;

export function isReceptionistDbConfigured(): boolean {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;
  return Boolean(url && key && !url.includes("YOUR_PROJECT"));
}

function getDb(): SupabaseClient | null {
  if (!isReceptionistDbConfigured()) return null;
  if (!db) {
    const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)!;
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY!;
    db = createClient(url, key);
  }
  return db;
}

export async function ensureSession(sessionId?: string): Promise<string> {
  const id = sessionId || crypto.randomUUID();
  const client = getDb();
  if (!client) return id;

  await client.from("concierge_sessions").upsert({ id, updated_at: new Date().toISOString() });
  return id;
}

export async function loadSessionMessages(
  sessionId: string,
  limit = 24
): Promise<ChatMessage[]> {
  const client = getDb();
  if (!client) return [];

  const { data } = await client
    .from("concierge_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(limit);

  return (data ?? []).map((row) => ({
    role: row.role as ChatMessage["role"],
    content: row.content,
  }));
}

export async function saveMessage(
  sessionId: string,
  role: ChatMessage["role"],
  content: string
): Promise<void> {
  const client = getDb();
  if (!client) return;

  await client.from("concierge_messages").insert({
    session_id: sessionId,
    role,
    content,
  });
  await client
    .from("concierge_sessions")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", sessionId);
}

export async function loadKnowledge(limit = 40): Promise<KnowledgeEntry[]> {
  const client = getDb();
  if (!client) return [];

  const { data } = await client
    .from("concierge_knowledge")
    .select("topic, content, source")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    topic: row.topic,
    content: row.content,
    source: row.source ?? undefined,
  }));
}

export async function saveKnowledgeEntries(
  entries: KnowledgeEntry[],
  sessionId?: string
): Promise<void> {
  const client = getDb();
  if (!client || entries.length === 0) return;

  await client.from("concierge_knowledge").insert(
    entries.map((e) => ({
      topic: e.topic,
      content: e.content,
      source: e.source ?? "conversation",
      session_id: sessionId ?? null,
    }))
  );
}
