"use client";
import {useEffect,useMemo,useState} from "react";
import CommunityOperationsBoard from "./CommunityOperationsBoard";

type Props={educators:any[]};

export default function KmCommunityBuilder({educators}:Props){
  const [mode,setMode]=useState<"builder"|"operations">("builder");
  const [brief,setBrief]=useState("I want a free tier with community, a $97 paid tier with courses, and a $297 VIP tier with 1-on-1 coaching.");
  const [educatorId,setEducatorId]=useState("");
  const [project,setProject]=useState<any>(null);
  const [projects,setProjects]=useState<any[]>([]);
  const [status,setStatus]=useState<any>(null);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState("");

  async function load(){
    const [p,s]=await Promise.all([fetch("/api/community/projects"),fetch("/api/community/status")]);
    const pd=await p.json().catch(()=>({projects:[]})); const sd=await s.json().catch(()=>null);
    if(p.ok)setProjects(pd.projects||[]); if(s.ok)setStatus(sd);
  }
  useEffect(()=>{void load();},[]);

  async function generate(){
    setBusy(true);setNotice("Pegasus is building the community blueprint…");
    const r=await fetch("/api/community/projects",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({brief,educator_id:educatorId||null})});
    const d=await r.json().catch(()=>({}));
    setBusy(false);
    if(!r.ok){setNotice(d.error||"Could not build community blueprint");return;}
    setProject(d.project);setNotice("BLUEPRINT READY · MARIE IS TRACKING THE PROJECT");await load();
  }

  async function approve(){
    if(!project)return;
    const r=await fetch(`/api/community/projects/${project.id}/approve`,{method:"POST"});
    const d=await r.json().catch(()=>({}));
    if(!r.ok){setNotice(d.error||"Could not approve blueprint");return;}
    setProject(d.project);setNotice("APPROVED · READY TO BUILD NATIVE COMMUNITY");await load();
  }

  async function provision(){
    if(!project)return;
    setBusy(true);setNotice("Pegasus is building the native community…");
    const r=await fetch(`/api/community/projects/${project.id}/provision`,{method:"POST"});
    const d=await r.json().catch(()=>({}));
    setBusy(false);
    if(!r.ok){setNotice(d.error||"Could not build native community");return;}
    setProject(d.project);
    setNotice(`COMMUNITY LIVE · MARIE NOW OWNS OPERATIONS · ${d.summary?.tiers||0} tiers · ${d.summary?.spaces||0} spaces · ${d.summary?.lessons||0} lessons`);
    await load();
  }

  const bp=project?.blueprint;
  const educator=useMemo(()=>educators.find(e=>String(e.id)===String(educatorId)),[educators,educatorId]);

  return <div className="panel circle-builder">
    <div className="circle-hero">
      <div><div className="eyebrow">KM CIRCLE · POWERED BY PEGASUS</div><h2>Build it. Then let Marie run it.</h2><p className="muted">Pegasus creates the membership structure and native community. Marie manages the operating lifecycle, specialist handoffs, member readiness, content completion and launch health.</p></div>
      <div className={"circle-connection "+(status?.provisioning_enabled?"online":"offline")}><span>●</span><div><b>Pegasus Community Engine</b><small>Native · Neon-backed · Marie managed</small></div></div>
    </div>

    <div className="circle-mode-tabs">
      <button className={mode==="builder"?"active":""} onClick={()=>setMode("builder")}>Community Builder</button>
      <button className={mode==="operations"?"active":""} onClick={()=>setMode("operations")}>Marie Operations</button>
    </div>

    {mode==="operations"?<CommunityOperationsBoard/>:<div className="circle-layout">
      <section className="circle-chat">
        <div className="circle-chat-head"><div><span className="eyebrow">CONVERSATION BUILDER</span><h3>Tell Pegasus what to build</h3></div><span className="pill">DRAFT SAFE</span></div>
        <label className="course-field"><span>Faculty / Community Owner</span><select value={educatorId} onChange={e=>setEducatorId(e.target.value)}><option value="">KMCE / unassigned</option>{educators.map(e=><option key={e.id} value={e.id}>{e.public_name}</option>)}</select></label>
        <div className="circle-message assistant"><b>Pegasus</b><p>Describe the community, tiers, price points, courses, coaching, events, or member experience you want. I’ll structure it before anything is created.</p></div>
        <div className="circle-message founder"><b>{educator?.public_name||"Founder"}</b><textarea value={brief} onChange={e=>setBrief(e.target.value)} rows={7}/></div>
        <button className="btn primary circle-build-btn" disabled={busy} onClick={()=>void generate()}>{busy?"Building blueprint…":"Generate Community Blueprint"}</button>
        {notice&&<div className="circle-notice">{notice}</div>}
        <div className="circle-recent"><div className="eyebrow">RECENT BLUEPRINTS</div>{projects.slice(0,5).map(p=><button key={p.id} onClick={()=>setProject(p)}><div><b>{p.project_name}</b><small>{p.educator_name||"KMCE"} · #{p.id}</small></div><span>{p.status}</span></button>)}</div>
      </section>

      <section className="circle-preview">
        <div className="circle-preview-head"><div><span className="eyebrow">LIVE BLUEPRINT</span><h3>{bp?.name||"Community architecture"}</h3></div>{project&&<span className={"circle-status "+String(project.status).toLowerCase()}>{project.status}</span>}</div>
        {!bp?<div className="circle-empty"><b>Your community will appear here.</b><p>Generate a blueprint to preview tiers, spaces, access groups, curriculum and provisioning order.</p></div>:<>
          <p className="muted">{bp.summary}</p>
          <div className="circle-section-title"><span>MEMBERSHIP TIERS</span><b>{bp.tiers?.length||0}</b></div>
          <div className="circle-tier-grid">{bp.tiers?.map((t:any)=><article key={t.name}><small>{t.access_group} ACCESS</small><h4>{t.name}</h4><strong>{t.price_monthly===0?"FREE":t.price_monthly==null?"TBD":"$"+t.price_monthly+"/mo"}</strong><p>{t.promise}</p><div>{t.spaces?.map((s:string)=><span key={s}>{s}</span>)}</div></article>)}</div>
          <div className="circle-section-title"><span>SPACES + ACCESS</span><b>{bp.spaces?.length||0}</b></div>
          <div className="circle-space-list">{bp.spaces?.map((s:any)=><div key={s.name}><span>{s.type==="course"?"▤":s.type==="event"?"◷":s.type==="coaching"?"◇":"◉"}</span><div><b>{s.name}</b><small>{s.type} · {s.visibility}</small></div></div>)}</div>
          {bp.course_outline?.length>0&&<><div className="circle-section-title"><span>COURSE CURRICULUM</span><b>{bp.course_outline.length}</b></div><div className="circle-curriculum">{bp.course_outline.map((x:any,i:number)=><div key={x.section}><span>{String(i+1).padStart(2,"0")}</span><div><b>{x.section}</b><small>{x.lessons.join(" · ")}</small></div></div>)}</div></>}
          <div className="circle-section-title"><span>PROVISIONING PLAN</span><b>{bp.provisioning_steps?.length||0}</b></div>
          <div className="circle-steps">{bp.provisioning_steps?.map((s:string,i:number)=><div key={s}><span>{i+1}</span><p>{s}</p></div>)}</div>
          <div className="circle-actions">
            {project.status==="DRAFT"?<button className="btn primary" onClick={()=>void approve()}>Approve Blueprint</button>:project.status==="APPROVED"?<button className="btn primary" disabled={busy} onClick={()=>void provision()}>{busy?"Building Community…":"Build Native Community"}</button>:<button className="btn primary" disabled>Community Live</button>}
            <span>{project.status==="LIVE"?"Marie has the live operations handoff.":"Founder approval is required before Pegasus creates the community."}</span>
          </div>
        </>}
      </section>
    </div>}
  </div>;
}
