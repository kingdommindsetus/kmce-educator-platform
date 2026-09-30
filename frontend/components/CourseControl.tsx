"use client";

import {useEffect,useState} from "react";
import CourseRevenuePlan from "./CourseRevenuePlan";

type Props={educators:any[]};

const empty={
  course_code:"KM-2026-001", educator_id:"", title:"", course_format:"Live webinar",
  target_audience:"Dental professionals", educational_need:"", learning_objectives:"",
  agenda:"", instructional_minutes:"", proposed_ce_hours:"", subject_code:"",
  reference_resources:"", attendance_method:"", completion_criteria:"", evaluation_method:"", assessment_plan:"",
};

export default function CourseControl({educators}:Props){
  const [courses,setCourses]=useState<any[]>([]);
  const [form,setForm]=useState<any>(empty);
  const [editing,setEditing]=useState<any>(null);
  const [notice,setNotice]=useState("");

  async function load(){
    const r=await fetch("/api/courses");
    const data=await r.json().catch(()=>[]);
    if(r.ok)setCourses(Array.isArray(data)?data:[]);
    else setNotice(data?.error||"Could not load course records");
  }
  useEffect(()=>{void load();},[]);

  function update(key:string,value:string){setForm((current:any)=>({...current,[key]:value}));}

  function editPacket(course:any){
    setEditing(course);
    setForm({
      course_code:course.course_code,educator_id:String(course.educator_id||""),title:course.title||"",course_format:course.course_format||"",target_audience:course.target_audience||"",educational_need:course.educational_need||"",learning_objectives:Array.isArray(course.learning_objectives)?course.learning_objectives.join("\n"):"",agenda:course.agenda||"",instructional_minutes:String(course.instructional_minutes||""),proposed_ce_hours:String(course.proposed_ce_hours||""),subject_code:course.subject_code||"",reference_resources:Array.isArray(course.reference_resources)?course.reference_resources.join("\n"):"",attendance_method:course.attendance_method||"",completion_criteria:course.completion_criteria||"",evaluation_method:course.evaluation_method||"",assessment_plan:course.assessment_plan||"",
    });
    setNotice(`${course.course_code} · EDIT PACKET`);
  }

  async function create(){
    setNotice("Saving course file…");
    const payload={...form,educator_id:Number(form.educator_id||0),instructional_minutes:Number(form.instructional_minutes||0),proposed_ce_hours:Number(form.proposed_ce_hours||0),learning_objectives:form.learning_objectives.split("\n").map((x:string)=>x.trim()).filter(Boolean),reference_resources:form.reference_resources.split("\n").map((x:string)=>x.trim()).filter(Boolean)};
    const r=await fetch("/api/courses",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const data=await r.json().catch(()=>({}));
    if(!r.ok){setNotice(data?.error||"Could not save course file");return;}
    setNotice("COURSE FILE CREATED · READY FOR INTERNAL REVIEW");
    setForm(empty);
    await load();
  }

  async function savePacket(){
    if(!editing)return;
    setNotice("Saving packet…");
    const payload={...form,instructional_minutes:Number(form.instructional_minutes||0),proposed_ce_hours:Number(form.proposed_ce_hours||0),learning_objectives:form.learning_objectives.split("\n").map((x:string)=>x.trim()).filter(Boolean),reference_resources:form.reference_resources.split("\n").map((x:string)=>x.trim()).filter(Boolean)};
    const r=await fetch(`/api/courses/${encodeURIComponent(editing.course_code)}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const data=await r.json().catch(()=>({}));
    if(!r.ok){setNotice(data?.error||"Could not save course packet");return;}
    setNotice(`${editing.course_code} · PACKET SAVED AS DRAFT`);
    await load();
  }

  async function submit(course:any){
    if(!window.confirm(`Submit ${course.course_code} for internal review? The packet will lock until a review decision is recorded.`))return;
    const r=await fetch(`/api/courses/${encodeURIComponent(course.course_code)}/submit`,{method:"POST"});
    const data=await r.json().catch(()=>({}));
    if(!r.ok){setNotice(data?.missing?.length?`MISSING BEFORE SUBMISSION: ${data.missing.join(", ")}`:(data?.error||"Could not submit course"));return;}
    setEditing(null); setNotice(`${course.course_code} · SUBMITTED FOR INTERNAL REVIEW`); await load();
  }

  async function decide(course:any,decision:string){
    if(!window.confirm(`Record ${decision.replaceAll("_"," ")} for ${course.course_code}?`))return;
    const decision_notes=window.prompt("Internal review note (optional):")||"";
    const r=await fetch(`/api/courses/${encodeURIComponent(course.course_code)}/authorize`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({decision,decision_notes})});
    const data=await r.json().catch(()=>({}));
    if(!r.ok){setNotice(data?.missing?.length?`MISSING BEFORE AUTHORIZATION: ${data.missing.join(", ")}`:(data?.error||"Authorization could not be recorded"));return;}
    setNotice(`${course.course_code} · ${decision.replaceAll("_"," ")} RECORDED`);
    await load();
  }

  return <div className="panel">
    <div className="eyebrow">KMCE · COURSE CONTROL</div>
    <h2>Course File & Internal Authorization</h2>
    <p className="muted">A course is not authorized merely because it is created. Approval is a separate founder decision recorded in the course file.</p>
    <div className="grid" style={{gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:10}}>
      <input value={form.course_code} onChange={e=>update("course_code",e.target.value)} placeholder="KM-YYYY-###" />
      <select value={form.educator_id} onChange={e=>update("educator_id",e.target.value)}><option value="">Faculty owner</option>{educators.map(e=><option value={e.id} key={e.id}>{e.public_name}</option>)}</select>
      <input value={form.title} onChange={e=>update("title",e.target.value)} placeholder="Course title" />
      <input value={form.course_format} onChange={e=>update("course_format",e.target.value)} placeholder="Format" />
      <input value={form.target_audience} onChange={e=>update("target_audience",e.target.value)} placeholder="Target audience" />
      <input value={form.subject_code} onChange={e=>update("subject_code",e.target.value)} placeholder="Subject code" />
      <input value={form.instructional_minutes} onChange={e=>update("instructional_minutes",e.target.value)} placeholder="Instructional minutes" type="number" min="0" />
      <input value={form.proposed_ce_hours} onChange={e=>update("proposed_ce_hours",e.target.value)} placeholder="Proposed CE hours" type="number" min="0" step="0.25" />
    </div>
    <textarea value={form.educational_need} onChange={e=>update("educational_need",e.target.value)} placeholder="Educational need" />
    <textarea value={form.learning_objectives} onChange={e=>update("learning_objectives",e.target.value)} placeholder="Learning objectives — one per line" />
    <textarea value={form.agenda} onChange={e=>update("agenda",e.target.value)} placeholder="Agenda and instructional-time calculation" />
    <textarea value={form.reference_resources} onChange={e=>update("reference_resources",e.target.value)} placeholder="References/resources — one per line" />
    <div className="grid" style={{gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:10}}>
      <input value={form.attendance_method} onChange={e=>update("attendance_method",e.target.value)} placeholder="Attendance method" />
      <input value={form.completion_criteria} onChange={e=>update("completion_criteria",e.target.value)} placeholder="Completion criteria" />
      <input value={form.evaluation_method} onChange={e=>update("evaluation_method",e.target.value)} placeholder="Evaluation method" />
      <input value={form.assessment_plan} onChange={e=>update("assessment_plan",e.target.value)} placeholder="Assessment plan if applicable" />
    </div>
    <button className="btn primary" onClick={()=>void (editing?savePacket():create())} style={{marginTop:10}}>{editing?`Save ${editing.course_code} Packet`:"Create Course File"}</button>
    {editing&&<button className="btn" onClick={()=>{setEditing(null);setForm(empty);}} style={{marginLeft:8}}>Cancel edit</button>}
    {notice&&<p><b>{notice}</b></p>}
    <div className="eyebrow" style={{marginTop:24}}>COURSE REGISTER</div>
    {courses.map(course=><div className="lead" key={course.id}>
      <div><b>{course.course_code} · {course.title}</b><div className="muted">{course.faculty_name} · {course.course_format} · {course.proposed_ce_hours} hours</div></div>
      <span className="pill">{course.authorization_status}</span>
      {course.authorization_status!=="UNDER_REVIEW"&&<button className="btn" onClick={()=>editPacket(course)}>Edit packet</button>}
      {course.authorization_status==="NOT_SUBMITTED"&&<button className="btn" onClick={()=>void submit(course)}>Submit for review</button>}
      {course.authorization_status==="UNDER_REVIEW"&&<><button className="btn" onClick={()=>void decide(course,"REVISION_REQUIRED")}>Request revision</button><button className="btn primary" onClick={()=>void decide(course,"APPROVED")}>Authorize</button></>}
    </div>)}
    {!courses.length&&<p className="muted">No course files yet. Create the first one above.</p>}
    {courses.length>0&&<CourseRevenuePlan courses={courses}/>}
  </div>;
}
