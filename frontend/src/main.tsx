import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Users, UserRound, Bell, DollarSign, CheckCircle2, LogOut, Plus, Search, UserCog, RefreshCw, ShieldCheck, UserPlus, Power, X, KeyRound } from 'lucide-react';
import { supabase } from './lib/supabase';
import './styles.css';

type Role = 'director' | 'admin' | 'sale';
type Lead = {
  id: string; full_name: string; phone: string | null; course: string | null; source: string;
  branch: string | null; status: string; assigned_to: string | null; notes: string | null;
  next_follow_up: string | null; created_at: string; assignee?: { full_name: string } | null;
};
type Profile = {
  id: string; full_name: string; email: string | null; role: Role;
  branch: string | null; active: boolean; created_at?: string;
};

const statusLabels: Record<string, string> = {
  new: 'Mới', consulting: 'Đang tư vấn', interested: 'Đã quan tâm',
  follow_up: 'Chờ follow-up', closed: 'Đã chốt', lost: 'Mất lead'
};
const roleLabels: Record<Role, string> = { director: 'Giám đốc', admin: 'Admin', sale: 'Sale' };
const demoLeads: Lead[] = [
  { id: 'demo-1', full_name: 'Nguyễn Thị Lan', phone: '09•••123', course: 'Tiếng Trung giao tiếp', source: 'Facebook', branch: 'Lạng Sơn', status: 'new', assigned_to: null, notes: null, next_follow_up: null, created_at: new Date().toISOString() },
  { id: 'demo-2', full_name: 'Trần Văn Nam', phone: '09•••456', course: 'HSK 1–2', source: 'Facebook Ads', branch: 'Bắc Ninh', status: 'consulting', assigned_to: null, notes: null, next_follow_up: null, created_at: new Date().toISOString() },
];

function App() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [showStaff, setShowStaff] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [resetStaff, setResetStaff] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) loadData();
    else if (!supabase) setLeads(demoLeads);
  }, [session]);

  async function loadData() {
    if (!supabase || !session) return;
    setLoading(true);
    setError('');
    const [{ data: p, error: pe }, { data: l, error: le }, { data: s, error: se }] = await Promise.all([
      supabase.from('profiles').select('id,full_name,email,role,branch,active,created_at').eq('id', session.user.id).single(),
      supabase.from('leads').select('*,assignee:profiles!leads_assigned_to_fkey(full_name)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id,full_name,email,role,branch,active,created_at').order('full_name')
    ]);
    if (pe) { setError(pe.message); setProfile(null); await supabase.auth.signOut(); return; }
    if (!p?.active) { setError('Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ Giám đốc.'); setProfile(null); await supabase.auth.signOut(); return; }
    if (le) setError(le.message);
    if (se) setError(se.message);
    setProfile(p);
    setLeads(l || []);
    setStaff(s || []);
    setLoading(false);
  }

  async function signOut() { await supabase?.auth.signOut(); setProfile(null); }

  const visible = useMemo(() => leads.filter(l =>
    (status === 'all' || l.status === status) &&
    [l.full_name, l.phone, l.course, l.source, l.branch].join(' ').toLowerCase().includes(query.toLowerCase())
  ), [leads, query, status]);

  async function addLead(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase || !session) return;
    const f = new FormData(e.currentTarget);
    const { error } = await supabase.from('leads').insert({
      full_name: f.get('full_name'), phone: f.get('phone'), course: f.get('course'),
      source: f.get('source') || 'manual', branch: f.get('branch'), notes: f.get('notes'), created_by: session.user.id
    });
    if (error) setError(error.message); else { setShowAdd(false); loadData(); }
  }

  async function assign(id: string, value: string) {
    if (!supabase) return;
    const { error } = await supabase.from('leads').update({ assigned_to: value || null }).eq('id', id);
    if (error) setError(error.message); else loadData();
  }

  async function updateStatus(id: string, value: string) {
    if (!supabase) return;
    const { error } = await supabase.from('leads').update({ status: value }).eq('id', id);
    if (error) setError(error.message); else loadData();
  }

  async function createStaff(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase) return;
    setError('');
    const f = new FormData(e.currentTarget);
    const payload = {
      full_name: f.get('full_name'), email: f.get('email'), password: f.get('password'),
      role: f.get('role'), branch: f.get('branch'), active: true
    };
    const { data, error } = await supabase.functions.invoke('staff-admin', { body: payload });
    if (error) { setError(error.message); return; }
    if (data?.error) { setError(data.error); return; }
    setShowStaffModal(false);
    await loadData();
  }

  async function toggleStaff(id: string, active: boolean) {
    if (!supabase) return;
    if (id === session?.user?.id) { setError('Không thể vô hiệu hóa chính tài khoản đang đăng nhập.'); return; }
    const { error } = await supabase.from('profiles').update({ active }).eq('id', id);
    if (error) setError(error.message); else loadData();
  }

  async function resetStaffPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase || !resetStaff) return;
    setError('');
    const f = new FormData(e.currentTarget);
    const password = String(f.get('password') || '');
    const confirm = String(f.get('confirm') || '');
    if (password.length < 8) { setError('Mật khẩu mới tối thiểu 8 ký tự.'); return; }
    if (password !== confirm) { setError('Mật khẩu xác nhận không khớp.'); return; }
    const { data, error } = await supabase.functions.invoke('staff-admin', {
      body: { action: 'reset_password', user_id: resetStaff.id, password }
    });
    if (error) { setError(error.message); return; }
    if (data?.error) { setError(data.error); return; }
    setResetStaff(null);
    setError('Đã đặt lại mật khẩu cho tài khoản.');
  }

  if (!supabase) return <Login onDemo={() => setSession({ user: { id: 'demo' } })} demo />;
  if (!session) return <Login />;

  const canManage = profile?.role === 'director' || profile?.role === 'admin';

  return <div className="app">
    <aside>
      <div className="brand"><div className="logo">LH</div><div><b>LIÊN HOA</b><small>GLOBAL EDUCATION</small></div></div>
      <nav>
        <a className={!showStaff ? 'active' : ''} onClick={() => setShowStaff(false)}>Inbox / Leads</a>
        <a>Khách hàng</a><a>Sale & Phân bổ</a><a>Follow-up</a><a>Khóa học</a><a>Thu học phí</a><a>KPI & Báo cáo</a>
        {canManage && <a className={showStaff ? 'active' : ''} onClick={() => setShowStaff(true)}><UserCog size={14}/> Quản trị nhân sự</a>}
      </nav>
      <div className="side-foot">
        <div className="user"><UserCog size={14}/><span>{profile?.full_name || session.user.email}</span></div>
        <small>{profile?.role ? roleLabels[profile.role].toUpperCase() : 'SALE'} {profile?.branch ? `• ${profile.branch}` : '• TOÀN HỆ THỐNG'}</small>
        <button onClick={signOut}><LogOut size={14}/> Đăng xuất</button>
      </div>
    </aside>

    <main>
      <header>
        <div><h1>{showStaff ? 'Quản trị nhân sự' : 'Inbox / Leads'}</h1><p>{showStaff ? 'Tạo tài khoản, phân quyền và quản lý nhân viên' : 'Lead Facebook, Inbox và Lead nhập tay'}</p></div>
        <div className="header-actions"><button className="icon-btn" onClick={loadData} disabled={loading}><RefreshCw size={17}/></button><button className="notify"><Bell size={18}/><span>3</span></button></div>
      </header>
      {error && <div className="error">{error}<button onClick={() => setError('')}><X size={13}/></button></div>}

      {showStaff ? <StaffPanel staff={staff} currentUserId={session.user.id} onAdd={() => setShowStaffModal(true)} onToggle={toggleStaff} onReset={setResetStaff} /> : <>
        <section className="cards">
          <Card icon={<Users/>} label="Tổng Lead" value={String(leads.length)} note="Theo quyền truy cập"/>
          <Card icon={<UserRound/>} label="Đang chăm sóc" value={String(leads.filter(x => ['consulting','interested','follow_up'].includes(x.status)).length)} note="Cần follow-up"/>
          <Card icon={<CheckCircle2/>} label="Đã chốt" value={String(leads.filter(x => x.status === 'closed').length)} note="Lead đã chốt"/>
          <Card icon={<DollarSign/>} label="Quyền" value={profile?.role?.toUpperCase() || 'SALE'} note={profile?.branch || 'Toàn hệ thống'}/>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Danh sách Lead</h2><p>{visible.length} Lead đang hiển thị</p></div><button className="primary" onClick={() => setShowAdd(true)}><Plus size={15}/> Thêm Lead</button></div>
          <div className="filters"><div className="search"><Search size={15}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm tên, SĐT, khóa học..."/></div><select value={status} onChange={e => setStatus(e.target.value)}><option value="all">Tất cả trạng thái</option>{Object.entries(statusLabels).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div className="table-wrap"><table><thead><tr><th>Khách hàng</th><th>Nhu cầu</th><th>Nguồn / Cơ sở</th><th>Sale phụ trách</th><th>Trạng thái</th><th>Follow-up</th></tr></thead>
            <tbody>{visible.map(l => <tr key={l.id}>
              <td><b>{l.full_name}</b><small>{l.phone || 'Chưa có SĐT'}</small></td><td>{l.course || '—'}</td><td>{l.source}<small>{l.branch || '—'}</small></td>
              <td>{canManage ? <select className="inline" value={l.assigned_to || ''} onChange={e => assign(l.id, e.target.value)}><option value="">Chưa phân</option>{staff.filter(x => x.role === 'sale' && x.active).map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select> : <span>{l.assignee?.full_name || 'Chưa phân'}</span>}</td>
              <td><select className="inline" value={l.status} onChange={e => updateStatus(l.id, e.target.value)}>{Object.entries(statusLabels).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></td>
              <td>{l.next_follow_up ? new Date(l.next_follow_up).toLocaleString('vi-VN') : 'Chưa đặt'}</td>
            </tr>)}</tbody>
          </table></div>
        </section>
      </>}
    </main>

    {showAdd && <div className="modal-backdrop"><form className="modal" onSubmit={addLead}>
      <h2>Thêm Lead mới</h2><input name="full_name" required placeholder="Họ và tên"/><input name="phone" placeholder="Số điện thoại"/><input name="course" placeholder="Khóa học / nhu cầu"/>
      <select name="source"><option>Facebook</option><option>Facebook Ads</option><option>Inbox</option><option>Website</option><option>Giới thiệu</option><option>manual</option></select>
      <select name="branch"><option>Bắc Ninh</option><option>Lạng Sơn</option></select><textarea name="notes" placeholder="Ghi chú"></textarea>
      <div className="modal-actions"><button type="button" onClick={() => setShowAdd(false)}>Hủy</button><button className="primary">Lưu Lead</button></div>
    </form></div>}
    {showStaffModal && <StaffModal onClose={() => setShowStaffModal(false)} onSubmit={createStaff}/>} 
    {resetStaff && <StaffPasswordModal staff={resetStaff} onClose={() => setResetStaff(null)} onSubmit={resetStaffPassword}/>} 
  </div>;
}

function StaffPanel({ staff, currentUserId, onAdd, onToggle, onReset }: { staff: Profile[]; currentUserId: string; onAdd: () => void; onToggle: (id: string, active: boolean) => void; onReset: (s: Profile) => void }) {
  const active = staff.filter(s => s.active).length;
  return <section className="panel">
    <div className="panel-head"><div><h2>Danh sách nhân viên</h2><p>{staff.length} tài khoản • {active} đang hoạt động</p></div><button className="primary" onClick={onAdd}><UserPlus size={15}/> Thêm nhân viên</button></div>
    <div className="staff-summary">
      <div><ShieldCheck size={17}/><b>Phân quyền</b><span>Giám đốc / Admin / Sale</span></div>
      <div><UserRound size={17}/><b>Cơ sở</b><span>Bắc Ninh / Lạng Sơn</span></div>
      <div><KeyRound size={17}/><b>Mật khẩu</b><span>Đặt lại trực tiếp</span></div>
    </div>
    <div className="table-wrap"><table><thead><tr><th>Nhân viên</th><th>Email đăng nhập</th><th>Vai trò</th><th>Cơ sở</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
      <tbody>{staff.map(s => <tr key={s.id}>
        <td><b>{s.full_name || 'Chưa đặt tên'}</b></td><td>{s.email || '—'}</td><td><span className="role-pill">{roleLabels[s.role]}</span></td><td>{s.branch || 'Toàn hệ thống'}</td>
        <td><span className={s.active ? 'status-on' : 'status-off'}>{s.active ? 'Đang hoạt động' : 'Đã vô hiệu hóa'}</span></td>
        <td>
          <button className="restore-btn" disabled={s.id === currentUserId} onClick={() => onReset(s)}><KeyRound size={13}/> Đặt lại mật khẩu</button>
          {' '}
          <button className={s.active ? 'danger-btn' : 'restore-btn'} disabled={s.id === currentUserId} onClick={() => onToggle(s.id, !s.active)}>{s.active ? <><Power size={13}/> Vô hiệu hóa</> : <><CheckCircle2 size={13}/> Kích hoạt</>}</button>
        </td>
      </tr>)}</tbody>
    </table></div>
  </section>;
}

function StaffPasswordModal({ staff, onClose, onSubmit }: { staff: Profile; onClose: () => void; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void }) {
  return <div className="modal-backdrop"><form className="modal" onSubmit={onSubmit}>
    <div className="modal-title"><div><h2>Đặt lại mật khẩu</h2><p>{staff.full_name} • {staff.email}</p></div><button type="button" className="close-btn" onClick={onClose}><X size={17}/></button></div>
    <label>Mật khẩu mới<input name="password" type="password" minLength={8} required autoFocus placeholder="Tối thiểu 8 ký tự"/></label>
    <label>Nhập lại mật khẩu<input name="confirm" type="password" minLength={8} required placeholder="Nhập lại mật khẩu mới"/></label>
    <div className="demo-note">Không cần biết mật khẩu cũ. Mật khẩu được đổi trực tiếp trên hệ thống bảo mật.</div>
    <div className="modal-actions"><button type="button" onClick={onClose}>Hủy</button><button className="primary"><KeyRound size={14}/> Đổi mật khẩu</button></div>
  </form></div>;
}

function StaffModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void }) {
  return <div className="modal-backdrop"><form className="modal" onSubmit={onSubmit}>
    <div className="modal-title"><div><h2>Thêm nhân viên</h2><p>Tạo tài khoản đăng nhập CRM và cấp quyền ngay</p></div><button type="button" className="close-btn" onClick={onClose}><X size={17}/></button></div>
    <label>Họ và tên<input name="full_name" required placeholder="Nguyễn Văn A"/></label>
    <label>Email đăng nhập<input name="email" type="email" required placeholder="nhanvien@lienhoa.edu.vn"/></label>
    <label>Mật khẩu ban đầu<input name="password" type="password" minLength={8} required placeholder="Tối thiểu 8 ký tự"/></label>
    <div className="form-grid"><label>Vai trò<select name="role" defaultValue="sale"><option value="sale">Sale</option><option value="admin">Admin</option><option value="director">Giám đốc</option></select></label><label>Cơ sở<select name="branch" defaultValue="Lạng Sơn"><option>Bắc Ninh</option><option>Lạng Sơn</option></select></label></div>
    <div className="modal-actions"><button type="button" onClick={onClose}>Hủy</button><button className="primary"><UserPlus size={14}/> Tạo tài khoản</button></div>
  </form></div>;
}

function Login({ onDemo, demo = false }: { onDemo?: () => void; demo?: boolean }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);

  async function login(e: React.FormEvent) {
    e.preventDefault(); if (!supabase) return; setMsg('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMsg(error.message);
  }

  async function forgot() {
    if (!supabase || !email) { setMsg('Nhập email trước rồi bấm Quên mật khẩu.'); return; }
    setSending(true); setMsg('');
    const redirectTo = window.location.origin + window.location.pathname;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setSending(false);
    if (error) setMsg(error.message); else setMsg('Đã gửi yêu cầu. Nếu email hợp lệ, hãy mở email mới nhất để đặt mật khẩu.');
  }

  return <div className="login"><div className="login-card"><div className="logo big">LH</div><h1>Liên Hoa CRM</h1><p>Đăng nhập hệ thống Sales & CSKH</p>
    {demo ? <><div className="demo-note">Chưa cấu hình Supabase. Đây là chế độ demo.</div><button className="primary full" onClick={onDemo}>Vào bản demo</button></> : <form onSubmit={login}>
      <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email nhân viên"/>
      <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Mật khẩu"/>
      {msg && <div className="error">{msg}</div>}
      <button className="primary full">Đăng nhập</button>
      <button type="button" className="recovery-link" onClick={forgot} disabled={sending}>{sending ? 'Đang gửi...' : 'Quên mật khẩu?'}</button>
    </form>}
  </div></div>;
}

function Card({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string; note: string }) {
  return <div className="card"><div className="card-icon">{icon}</div><div className="label">{label}</div><div className="value">{value}</div><div className="note">{note}</div></div>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
