import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const VERIFY_TOKEN = Deno.env.get('META_VERIFY_TOKEN') ?? '';
const PAGE_ACCESS_TOKEN = Deno.env.get('META_PAGE_ACCESS_TOKEN') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && token === VERIFY_TOKEN) return new Response(challenge, {status:200});
    return new Response('Forbidden', {status:403});
  }
  if (req.method !== 'POST') return new Response('Method Not Allowed', {status:405});
  try {
    const body = await req.json();
    if (body.object !== 'page') return new Response('Ignored', {status:200});
    for (const entry of body.entry ?? []) {
      const pageId = entry.id;
      for (const event of entry.messaging ?? []) {
        const senderId = event.sender?.id;
        const messageText = event.message?.text ?? '';
        if (!senderId) continue;
        const existing = await db.from('leads').select('id,notes').eq('meta_page_id',pageId).eq('meta_sender_id',senderId).maybeSingle();
        if (existing.data?.id) {
          await db.from('lead_activities').insert({lead_id:existing.data.id,actor_id:null,activity_type:'facebook_message',content:messageText});
          continue;
        }
        // Messenger webhook does not always include a phone/name. The Lead is created with the sender ID,
        // then staff can enrich it in CRM after the first message.
        const {data:lead,error} = await db.from('leads').insert({
          full_name:`Facebook ${senderId.slice(-6)}`,
          source:'Facebook Inbox',
          status:'new',
          meta_page_id:pageId,
          meta_sender_id:senderId,
          notes:messageText ? `Tin nhắn đầu tiên: ${messageText}` : null
        }).select('id').single();
        if (error) throw error;
        await db.from('lead_activities').insert({lead_id:lead.id,actor_id:null,activity_type:'facebook_message',content:messageText});
      }
    }
    return new Response('EVENT_RECEIVED',{status:200});
  } catch (e) {
    console.error(e);
    return new Response('Webhook error',{status:500});
  }
});
