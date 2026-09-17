import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CheckCircle2, KeyRound, Loader2 } from 'lucide-react';
import { supabase } from './lib/supabase';
import './styles.css';

function Recovery(){
  const [ready,setReady]=useState(false);
  const [password,setPassword]=useState('');
  const [confirm,setConfirm]=useState('');
  const [msg,setMsg]=useState('');
  const [busy,setBusy]=useState(false);
  useEffect(()=>{ if(!supabase){setMsg('CRM chưa được cấu hình Supabase.');return;} supabase.auth.getSession().then(({data})=>{ if(data.session) setReady(true); else setMsg('Liên kết đặt lại mật khẩu không còn hiệu lực hoặc đã hết hạn. Hãy yêu cầu một email mới.'); }); },[]);
  async function submit(e:React.FormEvent){e.preventDefault(); if(!supabase)return; if(password.length<8){setMsg('Mật khẩu mới phải có ít nhất 8 ký tự.');return;} if(password!==confirm){setMsg('Hai mật khẩu không khớp.');return;} setBusy(true);setMsg(''); const {error}=await supabase.auth.updateUser({password}); if(error){setMsg(error.message);setBusy(false);return;} setMsg('Đã đổi mật khẩu thành công. Đang chuyển về trang đăng nhập...'); await supabase.auth.signOut(); setTimeout(()=>{window.location.href=window.location.pathname;},1200); }
  return <div className="login"><div className="login-card"><div className="logo big"><KeyRound size={20}/></div><h1>Đặt mật khẩu mới</h1><p>Liên Hoa CRM • Khôi phục tài khoản an toàn</p>{!ready&&!msg&&<div className="demo-note"><Loader2 size={14}/> Đang xác thực liên kết...</div>}{ready&&<form onSubmit={submit}><input type="password" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mật khẩu mới (ít nhất 8 ký tự)" autoComplete="new-password"/><input type="password" minLength={8} required value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Nhập lại mật khẩu" autoComplete="new-password"/><button className="primary full" disabled={busy}>{busy?<><Loader2 size={14}/> Đang cập nhật...</>:<><CheckCircle2 size={14}/> Đặt mật khẩu mới</>}</button></form>}{msg&&<div className={msg.includes('thành công')?'recovery-success':'error'}>{msg}</div>}<button className="recovery-link" onClick={()=>window.location.href=window.location.pathname}>Quay lại đăng nhập</button></div></div>;
}

createRoot(document.getElementById('root')!).render(<Recovery/>);
