import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Users, UserRound, Bell, DollarSign, TrendingUp, MessageSquare, CheckCircle2, Clock3, Search, Plus, X, UserCheck, Phone, MapPin } from 'lucide-react';
import './styles.css';

type Status = 'Mới' | 'Đang tư vấn' | 'Đã quan tâm' | 'Chờ follow-up' | 'Đã chốt' | 'Mất lead';
type Lead = { id:number; name:string; phone:string; course:string; source:string; sale:string; status:Status; next:string; branch:string; note:string };

const sales = ['Nguyễn Mai','Phạm Hương','Lê Anh','Trần Minh'];
const statuses: Status[] = ['Mới','Đang tư vấn','Đã quan tâm','Chờ follow-up','Đã chốt','Mất lead'];
const initialLeads: Lead[] = [
 {id:1,name:'Nguyễn Thị Lan',phone:'0901 123 456',course:'Tiếng Trung giao tiếp',source:'Facebook',sale:'Nguyễn Mai',status:'Mới',next:'Hôm nay 20:00',branch:'Lạng Sơn',note:'Muốn học buổi tối'},
 {id:2,name:'Trần Văn Nam',phone:'0982 345 678',course:'HSK 1–2',source:'Facebook Ads',sale:'Phạm Hương',status:'Đang tư vấn',next:'Hôm nay 21:00',branch:'Bắc Ninh',note:'Đã gửi học phí'},
 {id:3,name:'Lê Thu Hà',phone:'0867 456 789',course:'Tiếng Trung 0 → HSK2',source:'Inbox',sale:'Nguyễn Mai',status:'Chờ follow-up',next:'18/09 09:00',branch:'Bắc Ninh',note:'Đang cân nhắc lịch học'},
 {id:4,name:'Hoàng Minh Đức',phone:'0912 333 321',course:'Du học Trung Quốc',source:'Facebook',sale:'Lê Anh',status:'Đã chốt',next:'Đã thu học phí',branch:'Lạng Sơn',note:'Đã đăng ký tư vấn hồ sơ'},
];

function App(){
 const [active,setActive]=useState('Tổng quan');
 const [leads,setLeads]=useState(initialLeads);
 const [search,setSearch]=useState('');
 const [showAdd,setShowAdd]=useState(false);
 const [selected,setSelected]=useState<Lead|null>(null);
 const [filter,setFilter]=useState<Status|'Tất cả'>('Tất cả');
 const [form,setForm]=useState({name:'',phone:'',course:'Tiếng Trung giao tiếp',source:'Facebook',sale:'Nguyễn Mai',branch:'Lạng Sơn',status:'Mới' as Status,note:''});

 const filtered=useMemo(()=>leads.filter(l=>(filter==='Tất cả'||l.status===filter)&&(`${l.name} ${l.phone} ${l.course} ${l.sale}`.toLowerCase().includes(search.toLowerCase()))),[leads,filter,search]);
 const updateLead=(id:number, patch:Partial<Lead>)=>setLeads(prev=>prev.map(l=>l.id===id?{...l,...patch}:l));
 const addLead=(e:React.FormEvent)=>{e.preventDefault();if(!form.name.trim()||!form.phone.trim())return;const id=Math.max(0,...leads.map(l=>l.id))+1;setLeads([{id,...form,next:'Chưa đặt lịch'},...leads]);setShowAdd(false);setForm({...form,name:'',phone:'',note:''});};
 const nav=['Tổng quan','Inbox / Leads','Khách hàng','Sale & Phân bổ','Follow-up','Khóa học','Thu học phí','KPI & Báo cáo','Cài đặt'];
 return <div className="app">
  <aside><div className="brand"><div className="logo">LH</div><div><b>LIÊN HOA</b><small>GLOBAL EDUCATION</small></div></div>
   <nav>{nav.map(n=><button key={n} className={active===n?'active':''} onClick={()=>setActive(n)}>{n}</button>)}</nav>
   <div className="side-foot">CRM nội bộ<br/><strong>Liên Hoa Global Education</strong></div>
  </aside>
  <main><header><div><h1>{active}</h1><p>{active==='Inbox / Leads'?'Quản lý Lead, phân Sale và trạng thái chăm sóc':'Trung tâm điều hành Sales & CSKH'}</p></div><button className="notify"><Bell size={18}/><span>3</span></button></header>
   {active!=='Inbox / Leads' ? <Dashboard leads={leads} onOpen={()=>setActive('Inbox / Leads')} /> : <LeadManager leads={leads} filtered={filtered} search={search} setSearch={setSearch} filter={filter} setFilter={setFilter} sales={sales} updateLead={updateLead} onAdd={()=>setShowAdd(true)} onSelect={setSelected}/>} 
  </main>
  {showAdd&&<Modal title="Thêm Lead mới" onClose={()=>setShowAdd(false)}><form className="lead-form" onSubmit={addLead}>
   <label>Họ và tên<input autoFocus value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Nguyễn Văn A"/></label>
   <label>Số điện thoại<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="09xx xxx xxx"/></label>
   <label>Khóa học<select value={form.course} onChange={e=>setForm({...form,course:e.target.value})}><option>Tiếng Trung giao tiếp</option><option>HSK 1–2</option><option>Tiếng Trung 0 → HSK2</option><option>Du học Trung Quốc</option><option>Tiếng Anh TOEIC/IELTS</option></select></label>
   <div className="form-two"><label>Nguồn<select value={form.source} onChange={e=>setForm({...form,source:e.target.value})}><option>Facebook</option><option>Facebook Ads</option><option>Inbox</option><option>TikTok</option><option>Giới thiệu</option><option>Khác</option></select></label><label>Cơ sở<select value={form.branch} onChange={e=>setForm({...form,branch:e.target.value})}><option>Lạng Sơn</option><option>Bắc Ninh</option></select></label></div>
   <div className="form-two"><label>Sale phụ trách<select value={form.sale} onChange={e=>setForm({...form,sale:e.target.value})}>{sales.map(s=><option key={s}>{s}</option>)}</select></label><label>Trạng thái<select value={form.status} onChange={e=>setForm({...form,status:e.target.value as Status})}>{statuses.map(s=><option key={s}>{s}</option>)}</select></label></div>
   <label>Ghi chú<textarea value={form.note} onChange={e=>setForm({...form,note:e.target.value})} placeholder="Nhu cầu, thời gian học, tình trạng tư vấn..."/></label>
   <div className="modal-actions"><button type="button" className="secondary" onClick={()=>setShowAdd(false)}>Hủy</button><button className="primary" type="submit">Lưu Lead</button></div>
  </form></Modal>}
  {selected&&<Modal title="Chi tiết Lead" onClose={()=>setSelected(null)}><div className="detail"><div className="detail-avatar">{selected.name.charAt(0)}</div><div><h3>{selected.name}</h3><p>{selected.course} · {selected.branch}</p></div></div><div className="detail-grid"><Info icon={<Phone/>} label="Điện thoại" value={selected.phone}/><Info icon={<UserCheck/>} label="Sale" value={selected.sale}/><Info icon={<MapPin/>} label="Cơ sở" value={selected.branch}/><Info icon={<MessageSquare/>} label="Nguồn" value={selected.source}/></div><label className="detail-label">Trạng thái chăm sóc<select value={selected.status} onChange={e=>{updateLead(selected.id,{status:e.target.value as Status});setSelected({...selected,status:e.target.value as Status})}}>{statuses.map(s=><option key={s}>{s}</option>)}</select></label><label className="detail-label">Phân Sale<select value={selected.sale} onChange={e=>{updateLead(selected.id,{sale:e.target.value});setSelected({...selected,sale:e.target.value})}}>{sales.map(s=><option key={s}>{s}</option>)}</select></label><div className="note-box"><b>Ghi chú</b><p>{selected.note||'Chưa có ghi chú.'}</p></div></Modal>}
 </div>
}

function Dashboard({leads,onOpen}:{leads:Lead[],onOpen:()=>void}){const closed=leads.filter(l=>l.status==='Đã chốt').length;return <><section className="cards"><Card icon={<Users/>} label="Lead hôm nay" value={String(leads.length)} note="Đang quản lý trên CRM"/><Card icon={<UserRound/>} label="Đang chăm sóc" value={String(leads.filter(l=>l.status!=='Mới'&&l.status!=='Đã chốt'&&l.status!=='Mất lead').length)} note="Cần follow-up"/><Card icon={<CheckCircle2/>} label="Đã chốt" value={String(closed)} note="Đã chuyển sang thu học phí"/><Card icon={<DollarSign/>} label="Doanh thu" value="33,480,000đ" note="Tháng 09/2026"/></section><div className="grid"><section className="panel"><div className="panel-head"><div><h2>Lead mới & hoạt động</h2><p>Facebook Page → CRM</p></div><button className="primary" onClick={onOpen}>Mở Inbox / Leads</button></div><LeadTable leads={leads.slice(0,5)} compact/></section><section className="panel"><div className="panel-head"><div><h2>Việc cần xử lý</h2><p>Ưu tiên trong ngày</p></div></div><div className="tasks"><Task icon={<MessageSquare/>} title="Lead chưa được phản hồi" sub="Kiểm tra Inbox Facebook"/><Task icon={<Clock3/>} title="Lịch follow-up hôm nay" sub="Cần xử lý trước 21:00"/><Task icon={<TrendingUp/>} title="Sale dưới KPI tuần" sub="Xem báo cáo Sale"/><Task icon={<DollarSign/>} title="Học viên chờ thu học phí" sub="Theo dõi công nợ"/></div></section></div><section className="panel pipeline"><div className="panel-head"><div><h2>Pipeline bán hàng</h2><p>Phễu Lead hiện tại</p></div></div><div className="stages">{statuses.slice(0,5).map(s=><Stage key={s} n={leads.filter(l=>l.status===s).length} t={s}/>)}</div></section></>}

function LeadManager({leads,filtered,search,setSearch,filter,setFilter,sales,updateLead,onAdd,onSelect}:{leads:Lead[],filtered:Lead[],search:string,setSearch:(v:string)=>void,filter:Status|'Tất cả',setFilter:(v:Status|'Tất cả')=>void,sales:string[],updateLead:(id:number,p:Partial<Lead>)=>void,onAdd:()=>void,onSelect:(l:Lead)=>void}){return <><section className="lead-toolbar"><div className="search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm tên, SĐT, khóa học, Sale..."/></div><button className="primary" onClick={onAdd}><Plus size={15}/> Thêm Lead</button></section><div className="filter-row"><span>Trạng thái:</span>{['Tất cả',...statuses].map(s=><button key={s} className={filter===s?'filter active-filter':'filter'} onClick={()=>setFilter(s as Status|'Tất cả')}>{s} <b>{s==='Tất cả'?leads.length:leads.filter(l=>l.status===s).length}</b></button>)}</div><section className="panel lead-panel"><LeadTable leads={filtered} onSelect={onSelect} sales={sales} updateLead={updateLead}/>{filtered.length===0&&<div className="empty">Không tìm thấy Lead phù hợp.</div>}</section></>}

function LeadTable({leads,compact=false,onSelect,sales,updateLead}:{leads:Lead[],compact?:boolean,onSelect?:(l:Lead)=>void,sales?:string[],updateLead?:(id:number,p:Partial<Lead>)=>void}){return <div className="table-wrap"><table><thead><tr><th>Khách hàng</th><th>Nhu cầu</th><th>Nguồn</th><th>Sale</th><th>Trạng thái</th><th>Follow-up</th>{!compact&&<th></th>}</tr></thead><tbody>{leads.map(l=><tr key={l.id} onClick={()=>onSelect?.(l)} className={onSelect?'clickable':''}><td><b>{l.name}</b><small>{l.phone}</small></td><td>{l.course}<small>{l.branch}</small></td><td>{l.source}</td><td onClick={e=>e.stopPropagation()}>{sales&&updateLead?<select className="inline-select" value={l.sale} onChange={e=>updateLead(l.id,{sale:e.target.value})}>{sales.map(s=><option key={s}>{s}</option>)}</select>:l.sale}</td><td onClick={e=>e.stopPropagation()}>{sales&&updateLead?<select className="inline-select status-select" value={l.status} onChange={e=>updateLead(l.id,{status:e.target.value as Status})}>{statuses.map(s=><option key={s}>{s}</option>)}</select>:<span className={'badge '+badgeClass(l.status)}>{l.status}</span>}</td><td>{l.next}</td>{!compact&&<td><button className="view-btn" onClick={e=>{e.stopPropagation();onSelect?.(l)}}>Chi tiết</button></td>}</tr>)}</tbody></table></div>}
function badgeClass(s:Status){return {'Mới':'new','Đang tư vấn':'consult','Đã quan tâm':'interest','Chờ follow-up':'follow','Đã chốt':'closed','Mất lead':'lost'}[s]}
function Card({icon,label,value,note}:{icon:React.ReactNode,label:string,value:string,note:string}){return <div className="card"><div className="card-icon">{icon}</div><div className="label">{label}</div><div className="value">{value}</div><div className="note">{note}</div></div>}
function Task({icon,title,sub}:{icon:React.ReactNode,title:string,sub:string}){return <div className="task"><div className="task-icon">{icon}</div><div><b>{title}</b><small>{sub}</small></div><span>›</span></div>}
function Stage({n,t}:{n:number,t:string}){return <div className="stage"><div className="stage-num">{n}</div><b>{t}</b><div className="bar"><i style={{width:`${Math.min(100,n*20)}%`}}/></div></div>}
function Info({icon,label,value}:{icon:React.ReactNode,label:string,value:string}){return <div className="info"><div>{icon}</div><small>{label}</small><b>{value}</b></div>}
function Modal({title,onClose,children}:{title:string,onClose:()=>void,children:React.ReactNode}){return <div className="overlay" onMouseDown={onClose}><div className="modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><h2>{title}</h2><button onClick={onClose}><X size={18}/></button></div>{children}</div></div>}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
