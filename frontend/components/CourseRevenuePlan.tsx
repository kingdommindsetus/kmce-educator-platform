"use client";
import {useEffect,useState} from "react";
import {courseDisplayLabel} from "../lib/course-labels";

const dollars=(minor:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(minor||0)/100);
const initial={faculty_investment_minor:"",course_price_minor:"",capacity:"",target_registrations:"",processing_fee_bps:"300",approved_direct_expenses_minor:"",faculty_share_bps:"8000",kmce_share_bps:"2000",target_return_multiple:"2"};

function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="course-field"><span>{label}</span>{children}</label>;}

export default function CourseRevenuePlan({course}:{course:any}){
  const [form,setForm]=useState<any>(initial); const [data,setData]=useState<any>(null); const [notice,setNotice]=useState("");
  const moneyToMinor=(value:any)=>value===""?"":String(Math.round(Number(value)*100));
  const minorToMoney=(value:any)=>value==null?"":String(Number(value)/100);

  async function load(){
    if(!course?.course_code)return;
    const r=await fetch(`/api/courses/${encodeURIComponent(course.course_code)}/revenue-plan`);
    const d=await r.json().catch(()=>null);
    if(!r.ok){setNotice(d?.error||"Could not load plan");return;}
    setData(d); const p=d.plan;
    setForm({faculty_investment_minor:minorToMoney(p.faculty_investment_minor),course_price_minor:minorToMoney(p.course_price_minor),capacity:String(p.capacity||""),target_registrations:String(p.target_registrations||""),processing_fee_bps:String(p.processing_fee_bps),approved_direct_expenses_minor:minorToMoney(p.approved_direct_expenses_minor),faculty_share_bps:String(p.faculty_share_bps),kmce_share_bps:String(p.kmce_share_bps),target_return_multiple:String(p.target_return_multiple)});
  }
  useEffect(()=>{void load();},[course?.course_code]);
  function set(key:string,value:string){setForm((x:any)=>({...x,[key]:value}));}
  async function save(){
    setNotice("Saving revenue plan…");
    const body={...form,faculty_investment_minor:moneyToMinor(form.faculty_investment_minor),course_price_minor:moneyToMinor(form.course_price_minor),approved_direct_expenses_minor:moneyToMinor(form.approved_direct_expenses_minor)};
    const r=await fetch(`/api/courses/${encodeURIComponent(course.course_code)}/revenue-plan`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    const d=await r.json().catch(()=>null); if(!r.ok){setNotice(d?.error||"Could not save plan");return;} setData(d); setNotice("REVENUE PLAN SAVED · INTERNAL PLANNING ONLY");
  }
  const e=data?.economics;

  return <section className="course-tab-page">
    <div className="course-section-head"><div><div className="eyebrow">FACULTY REVENUE PLAN</div><h3>{courseDisplayLabel(course)}</h3></div><span className="course-block-tag">PRIVATE PLANNING</span></div>
    <p className="course-tab-intro">Model investment, capacity, pricing and return targets without publishing or promising revenue.</p>

    {e&&<div className="revenue-kpis">
      <div><small>FACULTY TARGET</small><b>{dollars(e.faculty_target_minor)}</b><span>target return</span></div>
      <div><small>FACULTY PROJECTION</small><b>{dollars(e.faculty_projected_minor)}</b><span>current model</span></div>
      <div><small>GAP TO TARGET</small><b>{dollars(e.faculty_target_gap_minor)}</b><span>remaining gap</span></div>
      <div><small>BREAK-EVEN SEATS</small><b>{e.break_even_registrations??"—"}</b><span>{e.break_even_registrations==null?"set course price":"registrations"}</span></div>
    </div>}

    <div className="course-editor-card">
      <div className="course-card-title"><span>$</span><div><b>Revenue Scenario</b><small>Founder-controlled planning assumptions.</small></div></div>
      <div className="revenue-input-grid">
        <Field label="Faculty Investment ($)"><input value={form.faculty_investment_minor} onChange={e=>set("faculty_investment_minor",e.target.value)} type="number" min="0" step="0.01"/></Field>
        <Field label="Proposed Course Price ($)"><input value={form.course_price_minor} onChange={e=>set("course_price_minor",e.target.value)} type="number" min="0" step="0.01"/></Field>
        <Field label="Capacity"><input value={form.capacity} onChange={e=>set("capacity",e.target.value)} type="number" min="0"/></Field>
        <Field label="Target Registrations"><input value={form.target_registrations} onChange={e=>set("target_registrations",e.target.value)} type="number" min="0"/></Field>
        <Field label="Approved Direct Expenses ($)"><input value={form.approved_direct_expenses_minor} onChange={e=>set("approved_direct_expenses_minor",e.target.value)} type="number" min="0" step="0.01"/></Field>
        <Field label="Faculty Return Target (x)"><input value={form.target_return_multiple} onChange={e=>set("target_return_multiple",e.target.value)} type="number" min="0" step="0.25"/></Field>
      </div>
      <div className="course-save-row"><button className="btn primary" onClick={()=>void save()}>Save Revenue Plan</button><span>Nothing here publishes pricing or guarantees return.</span></div>
      {notice&&<p className="course-notice">{notice}</p>}
    </div>

    <div className="course-editor-card">
      <div className="course-card-title"><span>AI</span><div><b>Execution Pipeline</b><small>Who owns each commercial stage and whether it is gated.</small></div></div>
      <div className="execution-pipeline">{(data?.plan?.pipeline||[]).map((step:any,i:number)=><div className="pipeline-step" key={i}><span className="pipeline-index">{i+1}</span><div><b>{step.stage}</b><small>{step.owner}</small></div><em>{step.status}</em></div>)}</div>
    </div>
  </section>;
}
