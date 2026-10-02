import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const json=(body:any,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
Deno.serve(async (req)=>{
 if(req.method==='OPTIONS') return new Response('ok',{headers:cors});
 if(req.method!=='POST') return json({error:'Method not allowed'},405);
 try {
  const body=await req.json(); if(body.website) return json({ok:true});
  const full_name=String(body.full_name||'').trim(), phone=String(body.phone||'').trim();
  const email=String(body.email||'').trim()||null, branch=String(body.branch||'').trim()||null, course=String(body.course||'').trim()||null, notes=String(body.notes||'').trim()||null;
  if(!full_name||!phone) return json({error:'Họ tên và số điện thoại là bắt buộc.'},400);
  const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  let q=db.from('profiles').select('id,full_name,branch').eq('role','sale').eq('active',true); if(branch&&branch!=='Online') q=q.eq('branch',branch);
  const {data:sales,error:se}=await q; if(se) throw se;
  let assigned:any=null;
  if(sales?.length){ const ids=sales.map(x=>x.id); const {data:counts,error:ce}=await db.from('leads').select('assigned_to').in('assigned_to',ids); if(ce) throw ce; const cm=new Map(ids.map(id=>[id,0])); (counts||[]).forEach((r:any)=>cm.set(r.assigned_to,(cm.get(r.assigned_to)||0)+1)); assigned=sales.slice().sort((a:any,b:any)=>(cm.get(a.id)||0)-(cm.get(b.id)||0))[0]; }
  const {data:lead,error:le}=await db.from('leads').insert({full_name,phone,email,branch,course,notes,source:'website_tieng_trung',status:'new',assigned_to:assigned?.id||null}).select('id,full_name,phone,branch,course,assigned_to').single();
  if(le) throw le;
  await db.from('lead_activities').insert({lead_id:lead.id,actor_id:null,activity_type:'note',content:'Lead mới từ website Tiếng Trung Liên Hoa'});
  if(assigned) await db.from('lead_notifications').insert({lead_id:lead.id,recipient_id:assigned.id,title:'Lead mới từ website',content:full_name+' đăng ký '+(course||'tư vấn tiếng Trung')+' • '+phone});
  return json({ok:true,lead_id:lead.id,assigned_to:assigned?.id||null});
 } catch(error) { console.error(error); return json({error:'Không thể nhận đăng ký lúc này.'},500); }
});