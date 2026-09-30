"use client";

import {useEffect,useMemo,useState} from "react";
import CourseRevenuePlan from "./CourseRevenuePlan";
import CourseOfferLanes from "./CourseOfferLanes";
import {courseDisplayLabel,courseFormatLabel,courseYear,facultyShortName} from "../lib/course-labels";

type Props={educators:any[]};
type View="overview"|"packet"|"revenue"|"offers"|"authorization";

const empty={
  course_code:"KM-2026-001", working_name:"", educator_id:"", title:"", course_format:"Live seminar",
  target_audience:"Dental professionals", educational_need:"", learning_objectives:"",
  agenda:"", instructional_minutes:"", proposed_ce_hours:"", subject_code:"",
  reference_resources:"", attendance_method:"", completion_criteria:"", evaluation_method:"", assessment_plan:"",
};

function Field({label,hint,children}:{label:string;hint?:string;children:React.ReactNode}){
  return <label className="course-field"><span>{label}</span>{children}{hint&&<small>{hint}</small>}</label>;
}

function readiness(course:any){
  const checks=[
    ["Faculty owner",Boolean(course?.educator_id)],
    ["Public title",Boolean(course?.title)],
    ["Educational need",Boolean(course?.educational_need)],
    ["Learning objectives",Array.isArray(course?.learning_objectives)&&course.learning_objectives.length>0],
    ["Agenda",Boolean(course?.agenda)],
    ["Instructional time",Number(course?.instructional_minutes)>0],
    ["Proposed CE",Number(course?.proposed_ce_hours)>0],
    ["Attendance",Boolean(course?.attendance_method)],
    ["Completion",Boolean(course?.completion_criteria)],
    ["Evaluation",Boolean(course?.evaluation_method)],
    ["References",Array.isArray(course?.reference_resources)&&course.reference_resources.length>0],
  ];
  const complete=checks.filter(([,ok])=>ok).length;
  return {checks,percent:Math.round((complete/checks.length)*100)};
}

export default function CourseControl({educators}:Props){
  const [courses,setCourses]=useState<any[]>([]);
  const [form,setForm]=useState<any>(empty);
  const [editing,setEditing]=useState<any>(null);
  const [selectedCode,setSelectedCode]=useState("");
  const [view,setView]=useState<View>("overview");
  const [query,setQuery]=useState("");
  const [notice,setNotice]=useState("");

  async function load(){
    const r=await fetch("/api/courses");
    const data=await r.json().catch(()=>[]);
    if(r.ok){
      const rows=Array.isArray(data)?data:[];
      setCourses(rows);
      if(!selectedCode&&rows[0])setSelectedCode(rows[0].course_code);
    } else setNotice(data?.error||"Could not load course records");
  }
  useEffect(()=>{void load();},[]);

  const selected=useMemo(()=>courses.find(c=>c.course_code===selectedCode)||courses[0]||null,[courses,selectedCode]);
  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    if(!q)return courses;
    return courses.filter(c=>[c.faculty_name,c.title,c.working_name,c.course_code,c.course_format].some(v=>String(v||"").toLowerCase().includes(q)));
  },[courses,query]);

  const underReview=courses.filter(c=>c.authorization_status==="UNDER_REVIEW").length;
  const authorized=courses.filter(c=>["APPROVED","APPROVED_WITH_CONDITIONS"].includes(c.authorization_status)).length;
  const draft=courses.filter(c=>c.authorization_status==="NOT_SUBMITTED").length;

  function update(key:string,value:string){setForm((current:any)=>({...current,[key]:value}));}

  function generatedWorkingName(source:any){
    const educator=educators.find(e=>String(e.id)===String(source.educator_id));
    const name=educator?.public_name||editing?.faculty_name||"Faculty";
    return `${facultyShortName(name)} · ${courseYear(source.course_code)} · ${courseFormatLabel(source.course_format)}`;
  }

  function openNew(){
    setEditing(null);
    setForm(empty);
    setNotice("");
    setView("packet");
  }

  function editPacket(course:any){
    setSelectedCode(course.course_code);
    setEditing(course);
    setForm({
      course_code:course.course_code,working_name:course.working_name||"",educator_id:String(course.educator_id||""),
      title:course.title||"",course_format:course.course_format||"",target_audience:course.target_audience||"",
      educational_need:course.educational_need||"",
      learning_objectives:Array.isArray(course.learning_objectives)?course.learning_objectives.join("\n"):"",
      agenda:course.agenda||"",instructional_minutes:String(course.instructional_minutes||""),
      proposed_ce_hours:String(course.proposed_ce_hours||""),subject_code:course.subject_code||"",
      reference_resources:Array.isArray(course.reference_resources)?course.reference_resources.join("\n"):"",
      attendance_method:course.attendance_method||"",completion_criteria:course.completion_criteria||"",
      evaluation_method:course.evaluation_method||"",assessment_plan:course.assessment_plan||"",
    });
    setNotice("");
    setView("packet");
  }

  function payloadFromForm(){
    return {
      ...form,
      working_name:String(form.working_name||"").trim()||generatedWorkingName(form),
      educator_id:Number(form.educator_id||0),
      instructional_minutes:Number(form.instructional_minutes||0),
      proposed_ce_hours:Number(form.proposed_ce_hours||0),
      learning_objectives:String(form.learning_objectives||"").split("\n").map((x:string)=>x.trim()).filter(Boolean),
      reference_resources:String(form.reference_resources||"").split("\n").map((x:string)=>x.trim()).filter(Boolean),
    };
  }

  async function create(){
    setNotice("Saving course file…");
    const r=await fetch("/api/courses",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payloadFromForm())});
    const data=await r.json().catch(()=>({}));
    if(!r.ok){setNotice(data?.error||"Could not save course file");return;}
    setNotice("COURSE FILE CREATED · DRAFT SAVED");
    setForm(empty);
    setEditing(null);
    await load();
    if(data?.course_code)setSelectedCode(data.course_code);
    setView("overview");
  }

  async function savePacket(){
    if(!editing)return;
    setNotice("Saving packet…");
    const r=await fetch(`/api/courses/${encodeURIComponent(editing.course_code)}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(payloadFromForm())});
    const data=await r.json().catch(()=>({}));
    if(!r.ok){setNotice(data?.error||"Could not save course packet");return;}
    setNotice(`${courseDisplayLabel(editing)} · PACKET SAVED`);
    await load();
  }

  async function submit(course:any){
    if(!window.confirm(`Submit ${courseDisplayLabel(course)} for internal review? The packet will lock until a review decision is recorded.`))return;
    const r=await fetch(`/api/courses/${encodeURIComponent(course.course_code)}/submit`,{method:"POST"});
    const data=await r.json().catch(()=>({}));
    if(!r.ok){setNotice(data?.missing?.length?`MISSING BEFORE SUBMISSION: ${data.missing.join(", ")}`:(data?.error||"Could not submit course"));return;}
    setEditing(null); setNotice(`${courseDisplayLabel(course)} · SUBMITTED FOR INTERNAL REVIEW`); await load();
  }

  async function decide(course:any,decision:string){
    if(!window.confirm(`Record ${decision.replaceAll("_"," ")} for ${courseDisplayLabel(course)}?`))return;
    const decision_notes=window.prompt("Internal review note (optional):")||"";
    const r=await fetch(`/api/courses/${encodeURIComponent(course.course_code)}/authorize`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({decision,decision_notes})});
    const data=await r.json().catch(()=>({}));
    if(!r.ok){setNotice(data?.missing?.length?`MISSING BEFORE AUTHORIZATION: ${data.missing.join(", ")}`:(data?.error||"Authorization could not be recorded"));return;}
    setNotice(`${courseDisplayLabel(course)} · ${decision.replaceAll("_"," ")} RECORDED`);
    await load();
  }

  const ready=selected?readiness(selected):null;

  return <div className="panel course-workspace">
    <div className="course-hero">
      <div>
        <div className="eyebrow">KMCE · COURSE OPERATIONS</div>
        <h2>Course Control</h2>
        <p className="muted">Faculty-first course management with controlled CE review, commercial planning and traceable authorization.</p>
      </div>
      <button className="btn primary course-new" onClick={openNew}>+ New Course</button>
    </div>

    <div className="course-kpis">
      <button onClick={()=>setView("overview")}><small>ALL COURSES</small><b>{courses.length}</b><span>controlled records</span></button>
      <button onClick={()=>setView("overview")}><small>IN DRAFT</small><b>{draft}</b><span>building packet</span></button>
      <button onClick={()=>setView("authorization")}><small>IN REVIEW</small><b>{underReview}</b><span>founder decision</span></button>
      <button onClick={()=>setView("overview")}><small>AUTHORIZED</small><b>{authorized}</b><span>approved records</span></button>
    </div>

    {selected&&<div className="course-context">
      <div>
        <small>ACTIVE COURSE</small>
        <b>{courseDisplayLabel(selected)}</b>
        <span>{selected.title||"Public title not set"} · {selected.course_code}</span>
      </div>
      <div className="course-tabs">
        {(["overview","packet","revenue","offers","authorization"] as View[]).map(tab=><button key={tab} className={view===tab?"active":""} onClick={()=>{setView(tab);if(tab==="packet")editPacket(selected);}}>{tab==="authorization"?"CE Review":tab}</button>)}
      </div>
    </div>}

    {view==="overview"&&<>
      <div className="course-directory-head">
        <div><div className="eyebrow">COURSE DIRECTORY</div><h3>Faculty course files</h3></div>
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search doctor, course, year or ID…" />
      </div>
      <div className="course-directory">
        {filtered.map(course=><button className={"course-card "+(selected?.course_code===course.course_code?"selected":"")} key={course.id} onClick={()=>setSelectedCode(course.course_code)}>
          <div className="course-card-top"><span className="faculty-avatar">{facultyShortName(course.faculty_name).replace("Dr. ","").slice(0,2).toUpperCase()}</span><div><small>{courseYear(course.course_code)} · {courseFormatLabel(course.course_format)}</small><b>{courseDisplayLabel(course)}</b></div><em>{String(course.authorization_status||"NOT_SUBMITTED").replaceAll("_"," ")}</em></div>
          <p>{course.title||"Public course title not entered"}</p>
          <div className="course-card-meta"><span>{Number(course.proposed_ce_hours||0).toFixed(2)} proposed CE</span><span>{course.course_code}</span></div>
          <div className="course-card-actions"><span onClick={e=>{e.stopPropagation();editPacket(course)}}>Open Course →</span></div>
        </button>)}
        {!filtered.length&&<div className="course-empty">No courses match your search.</div>}
      </div>
    </>}

    {view==="packet"&&<div className="course-editor">
      <div className="course-section-head">
        <div><div className="eyebrow">{editing?"EDIT COURSE PACKET":"NEW COURSE FILE"}</div><h3>{editing?courseDisplayLabel(editing):"Create a controlled course record"}</h3></div>
        <p>Clear labels replace placeholder-only fields. The internal ID remains permanent; the human-facing label stays faculty-first.</p>
      </div>

      <div className="course-editor-card">
        <div className="course-card-title"><span>01</span><div><b>Course Identity</b><small>Who owns it, what year it belongs to, and how the team should refer to it.</small></div></div>
        <div className="course-form-grid">
          <Field label="Internal Course ID" hint="Permanent system identifier."><input value={form.course_code} disabled={Boolean(editing)} onChange={e=>update("course_code",e.target.value)} placeholder="KM-2026-001"/></Field>
          <Field label="Faculty Owner"><select value={form.educator_id} onChange={e=>update("educator_id",e.target.value)}><option value="">Select faculty</option>{educators.map(e=><option value={e.id} key={e.id}>{e.public_name}</option>)}</select></Field>
          <Field label="Internal Working Name" hint={`Suggested: ${generatedWorkingName(form)}`}><input value={form.working_name} onChange={e=>update("working_name",e.target.value)} placeholder={generatedWorkingName(form)}/></Field>
          <Field label="Delivery Format"><select value={form.course_format} onChange={e=>update("course_format",e.target.value)}>{["Live seminar","In-office training","Live webinar","Online / on-demand","Hybrid","Legacy"].map(x=><option key={x}>{x}</option>)}</select></Field>
          <Field label="Public Course Title"><input value={form.title} onChange={e=>update("title",e.target.value)} placeholder="Course title shown publicly"/></Field>
          <Field label="Target Audience"><input value={form.target_audience} onChange={e=>update("target_audience",e.target.value)} placeholder="Dentists and dental professionals"/></Field>
          <Field label="AGD Subject Code"><input value={form.subject_code} onChange={e=>update("subject_code",e.target.value)} placeholder="Confirm before authorization"/></Field>
        </div>
      </div>

      <div className="course-editor-card">
        <div className="course-card-title"><span>02</span><div><b>Educational Packet</b><small>Need, objectives, agenda and evidence supporting the educational activity.</small></div></div>
        <div className="course-text-grid">
          <Field label="Educational Need"><textarea value={form.educational_need} onChange={e=>update("educational_need",e.target.value)} placeholder="What gap in knowledge, skill or practice does this activity address?"/></Field>
          <Field label="Learning Objectives" hint="One measurable objective per line."><textarea value={form.learning_objectives} onChange={e=>update("learning_objectives",e.target.value)} placeholder={"Describe…\nIdentify…\nApply…"}/></Field>
          <Field label="Agenda + Instructional Time"><textarea value={form.agenda} onChange={e=>update("agenda",e.target.value)} placeholder="8:15–10:15 · Module 1 · 120 minutes"/></Field>
          <Field label="References / Resources" hint="One source per line."><textarea value={form.reference_resources} onChange={e=>update("reference_resources",e.target.value)} placeholder="Peer-reviewed references, policies and supporting evidence"/></Field>
        </div>
        <div className="course-form-grid compact">
          <Field label="Instructional Minutes"><input value={form.instructional_minutes} onChange={e=>update("instructional_minutes",e.target.value)} type="number" min="0"/></Field>
          <Field label="Proposed CE Hours"><input value={form.proposed_ce_hours} onChange={e=>update("proposed_ce_hours",e.target.value)} type="number" min="0" step="0.25"/></Field>
        </div>
      </div>

      <div className="course-editor-card">
        <div className="course-card-title"><span>03</span><div><b>CE Controls</b><small>How attendance, completion, evaluation and assessment will be documented.</small></div></div>
        <div className="course-form-grid">
          <Field label="Attendance Method"><input value={form.attendance_method} onChange={e=>update("attendance_method",e.target.value)} placeholder="Sign-in / verified attendance"/></Field>
          <Field label="Completion Criteria"><input value={form.completion_criteria} onChange={e=>update("completion_criteria",e.target.value)} placeholder="Requirements to receive credit"/></Field>
          <Field label="Evaluation Method"><input value={form.evaluation_method} onChange={e=>update("evaluation_method",e.target.value)} placeholder="Post-course evaluation"/></Field>
          <Field label="Assessment Plan"><input value={form.assessment_plan} onChange={e=>update("assessment_plan",e.target.value)} placeholder="If applicable"/></Field>
        </div>
      </div>

      <div className="course-editor-actions">
        <button className="btn primary" onClick={()=>void (editing?savePacket():create())}>{editing?"Save Course Packet":"Create Course File"}</button>
        <button className="btn" onClick={()=>{setView("overview");setEditing(null);setForm(empty);}}>Cancel</button>
        {notice&&<span>{notice}</span>}
      </div>
    </div>}

    {view==="revenue"&&selected&&<CourseRevenuePlan course={selected}/>}
    {view==="offers"&&selected&&<CourseOfferLanes course={selected}/>}

    {view==="authorization"&&selected&&ready&&<div className="authorization-workspace">
      <div className="course-section-head">
        <div><div className="eyebrow">INTERNAL CE AUTHORIZATION</div><h3>{courseDisplayLabel(selected)}</h3></div>
        <div className="readiness-score"><b>{ready.percent}%</b><span>packet readiness</span></div>
      </div>
      <div className="readiness-grid">
        {ready.checks.map(([label,ok]:any)=><div className={ok?"ready":"missing"} key={label}><span>{ok?"✓":"!"}</span><div><b>{label}</b><small>{ok?"Complete":"Needs attention"}</small></div></div>)}
      </div>
      <div className="authorization-bar">
        <div><small>CURRENT STATUS</small><b>{String(selected.authorization_status||"NOT_SUBMITTED").replaceAll("_"," ")}</b><span>{selected.course_code}</span></div>
        <div>
          {selected.authorization_status==="NOT_SUBMITTED"&&<button className="btn primary" onClick={()=>void submit(selected)}>Submit for Internal Review</button>}
          {selected.authorization_status==="UNDER_REVIEW"&&<><button className="btn" onClick={()=>void decide(selected,"REVISION_REQUIRED")}>Request Revision</button><button className="btn primary" onClick={()=>void decide(selected,"APPROVED")}>Authorize Course</button></>}
        </div>
      </div>
      {notice&&<p className="course-notice">{notice}</p>}
    </div>}
  </div>;
}
