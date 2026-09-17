import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const verifyToken = Deno.env.get("META_WEBHOOK_VERIFY_TOKEN") ?? "LIENHOA_CRM_FB_VERIFY_2026";
const appSecret = Deno.env.get("META_APP_SECRET") ?? "";
const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

function hex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifySignature(body: string, signature: string | null) {
  if (!appSecret) return false;
  if (!signature?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(appSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
  return digest === signature.slice(7);
}

async function processEvent(event: any) {
  const senderId = event?.sender?.id;
  const pageId = event?.recipient?.id;
  if (!senderId || !pageId) return;

  await supabase.from("facebook_pages").upsert({
    page_id: String(pageId),
    active: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: "page_id" });

  const message = event?.message;
  const text = typeof message?.text === "string" ? message.text : (event?.postback?.title ?? null);
  const messageId = message?.mid ?? null;
  const messageAt = new Date(Number(event?.timestamp ?? Date.now())).toISOString();

  let { data: conversation, error: convError } = await supabase
    .from("facebook_conversations").select("id,lead_id")
    .eq("page_id", String(pageId)).eq("sender_id", String(senderId)).maybeSingle();
  if (convError) throw convError;

  let leadId = conversation?.lead_id ?? null;
  if (!leadId) {
    const { data: existingLead, error } = await supabase.from("leads").select("id")
      .eq("meta_page_id", String(pageId)).eq("meta_sender_id", String(senderId)).maybeSingle();
    if (error) throw error;
    leadId = existingLead?.id ?? null;
  }

  if (!leadId) {
    const { data: newLead, error } = await supabase.from("leads").insert({
      full_name: `Facebook ${senderId}`,
      source: "facebook",
      status: "new",
      meta_page_id: String(pageId),
      meta_sender_id: String(senderId),
      meta_lead_id: messageId ? String(messageId) : null,
      notes: "Tự động tạo từ Messenger Fanpage",
    }).select("id").single();
    if (error) throw error;
    leadId = newLead.id;
  }

  const { data: savedConversation, error: upsertError } = await supabase.from("facebook_conversations").upsert({
    page_id: String(pageId), sender_id: String(senderId), thread_id: String(senderId),
    lead_id: leadId, last_message: text, last_message_at: messageAt,
    updated_at: new Date().toISOString(),
  }, { onConflict: "page_id,sender_id" }).select("id").single();
  if (upsertError) throw upsertError;

  if (messageId || text) {
    const { error } = await supabase.from("facebook_messages").upsert({
      conversation_id: savedConversation.id, message_id: messageId ? String(messageId) : null,
      sender_id: String(senderId), recipient_id: String(pageId), direction: "inbound",
      message_text: text, message_at: messageAt, raw_payload: event,
    }, { onConflict: "message_id", ignoreDuplicates: true });
    if (error) throw error;
  }

  if (text) await supabase.from("lead_activities").insert({
    lead_id: leadId, actor_id: null, activity_type: "facebook_message", content: text,
  });
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === verifyToken && challenge) return new Response(challenge, { status: 200 });
    return new Response("Forbidden", { status: 403 });
  }
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  const body = await req.text();
  if (!(await verifySignature(body, req.headers.get("x-hub-signature-256")))) return new Response("Invalid signature", { status: 403 });
  try {
    const payload = JSON.parse(body);
    if (payload.object !== "page") return json({ ok: true });
    for (const entry of payload.entry ?? []) for (const event of entry.messaging ?? []) await processEvent(event);
    return json({ ok: true });
  } catch (error) {
    console.error(error);
    return json({ ok: false, error: String(error) }, 500);
  }
});
