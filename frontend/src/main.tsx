import React from 'react';
import { createRoot } from 'react-dom/client';
import { Users, UserRound, Bell, DollarSign, TrendingUp, MessageSquare, CheckCircle2, Clock3 } from 'lucide-react';
import './styles.css';

const leads = [
  {name:'Nguyễn Thị Lan', phone:'09••• 123', course:'Tiếng Trung giao tiếp', source:'Facebook', sale:'Nguyễn Mai', status:'Mới', next:'Hôm nay 20:00'},
  {name:'Trần Văn Nam', phone:'09••• 456', course:'HSK 1–2', source:'Facebook Ads', sale:'Phạm Hương', status:'Đang tư vấn', next:'Hôm nay 21:00'},
  {name:'Lê Thu Hà', phone:'08••• 789', course:'Tiếng Trung 0 → HSK2', source:'Inbox', sale:'Nguyễn Mai', status:'Chờ follow-up', next:'18/09 09:00'},
  {name:'Hoàng Minh Đức', phone:'09••• 321', course:'Du học Trung Quốc', source:'Facebook', sale:'Lê Anh', status:'Đã chốt', next:'Đã thu học phí'},
];

function App(){
 return <div className="app">
  <aside><div className="brand"><div className="logo">LH</div><div><b>LIÊN HOA</b><small>GLOBAL EDUCATION</small></div></div>
   <nav><a className="active">Tổng quan</a><a>Inbox / Leads</a><a>Khách hàng</a><a>Sale & Phân bổ</a><a>Follow-up</a><a>Khóa học</a><a>Thu học phí</a><a>KPI & Báo cáo</a><a>Cài đặt</a></nav>
   <div className="side-foot">CRM nội bộ<br/><strong>Liên Hoa Global Education</strong></div>
  </aside>
  <main><header><div><h1>Tổng quan</h1><p>Trung tâm điều hành Sales & CSKH</p></div><button className="notify"><Bell size={18}/><span>3</span></button></header>
   <section className="cards"><Card icon={<Users/>} label="Lead hôm nay" value="48" note="+12% so với hôm qua"/><Card icon={<UserRound/>} label="Đang chăm sóc" value="31" note="8 lead cần follow-up"/><Card icon={<CheckCircle2/>} label="Đã chốt" value="12" note="Tỷ lệ chốt 25%"/><Card icon={<DollarSign/>} label="Doanh thu" value="33,480,000đ" note="Tháng 09/2026"/></section>
   <div className="grid"><section className="panel"><div className="panel-head"><div><h2>Lead mới & hoạt động</h2><p>Facebook Page → CRM</p></div><button className="primary">+ Thêm Lead</button></div><div className="table-wrap"><table><thead><tr><th>Khách hàng</th><th>Nhu cầu</th><th>Nguồn</th><th>Sale</th><th>Trạng thái</th><th>Follow-up</th></tr></thead><tbody>{leads.map((l,i)=><tr key={i}><td><b>{l.name}</b><small>{l.phone}</small></td><td>{l.course}</td><td>{l.source}</td><td>{l.sale}</td><td><span className={'badge b'+i}>{l.status}</span></td><td>{l.next}</td></tr>)}</tbody></table></div></section>
    <section className="panel"><div className="panel-head"><div><h2>Việc cần xử lý</h2><p>Ưu tiên trong ngày</p></div></div><div className="tasks"><Task icon={<MessageSquare/>} title="8 Lead chưa được phản hồi" sub="Inbox Facebook"/><Task icon={<Clock3/>} title="12 lịch follow-up hôm nay" sub="Cần xử lý trước 21:00"/><Task icon={<TrendingUp/>} title="3 Sale dưới KPI tuần" sub="Xem báo cáo Sale"/><Task icon={<DollarSign/>} title="5 học viên chờ thu học phí" sub="Tổng 13.950.000đ"/></div></section>
   </div>
   <section className="panel pipeline"><div className="panel-head"><div><h2>Pipeline bán hàng</h2><p>Phễu Lead tháng 09/2026</p></div></div><div className="stages"><Stage n="48" t="Lead mới"/><Stage n="31" t="Đang tư vấn"/><Stage n="18" t="Đã quan tâm"/><Stage n="12" t="Đã chốt"/><Stage n="9" t="Đã thu tiền"/></div></section>
  </main>
 </div>
}
function Card({icon,label,value,note}:{icon:React.ReactNode,label:string,value:string,note:string}){return <div className="card"><div className="card-icon">{icon}</div><div className="label">{label}</div><div className="value">{value}</div><div className="note">{note}</div></div>}
function Task({icon,title,sub}:{icon:React.ReactNode,title:string,sub:string}){return <div className="task"><div className="task-icon">{icon}</div><div><b>{title}</b><small>{sub}</small></div><span>›</span></div>}
function Stage({n,t}:{n:string,t:string}){return <div className="stage"><div className="stage-num">{n}</div><b>{t}</b><div className="bar"><i style={{width:`${Math.min(100,Number(n)*2)}%`}}/></div></div>}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
