"use client";
import {useEffect,useState} from "react";

export default function CommunityOperationsBoard(){
  const [data,setData]=useState<any>(null);
  const [loading,setLoading]=useState(true);

  async function load(){
    setLoading(true);
    const r=await fetch("/api/community/operations");
    const d=await r.json().catch(()=>null);
    if(r.ok)setData(d);
    setLoading(false);
  }
  useEffect(()=>{void load();},[]);

  const summary=data?.summary||{};
  const rows=data?.communities||[];

  return <section className="community-ops">
    <div className="community-ops-head">
      <div><div className="eyebrow">MARIE · COMMUNITY OPERATIONS</div><h3>Community operating board</h3><p>Marie owns the day-to-day flow from approved blueprint through content, onboarding, launch and live member operations.</p></div>
      <button className="btn" onClick={()=>void load()}>{loading?"Refreshing…":"Refresh"}</button>
    </div>

    <div className="community-ops-kpis">
      <div><small>COMMUNITIES</small><b>{summary.total||0}</b><span>{summary.live||0} built</span></div>
      <div><small>NEEDS ATTENTION</small><b>{summary.needs_attention||0}</b><span>Marie / Founder queue</span></div>
      <div><small>ACTIVE MEMBERS</small><b>{summary.members||0}</b><span>native records</span></div>
      <div><small>MARIE TASKS</small><b>{summary.marie_open_tasks||0}</b><span>queued + in progress</span></div>
    </div>

    <div className="community-ops-list">
      {rows.map((row:any)=><article className="community-ops-card" key={row.project_id}>
        <div className="community-ops-title">
          <div><small>{row.educator_name||"KMCE"} · #{row.project_id}</small><h4>{row.community_name||row.project_name}</h4></div>
          <span className={"ops-health "+String(row.health||"").toLowerCase().replace("_","-")}>{row.health}</span>
        </div>
        <div className="community-stage"><span>{row.stage.replaceAll("_"," ")}</span><i>Owned by Marie</i></div>
        <div className="community-ops-stats">
          <div><b>{row.tier_count||0}</b><small>Tiers</small></div>
          <div><b>{row.space_count||0}</b><small>Spaces</small></div>
          <div><b>{row.member_count||0}</b><small>Members</small></div>
          <div><b>{row.draft_lessons||0}</b><small>Draft lessons</small></div>
        </div>
        {row.blocker&&<div className="community-blocker"><span>BLOCKER</span><b>{row.blocker}</b></div>}
        <div className="community-next"><small>NEXT ACTION</small><b>{row.next_action}</b><span>{row.next_event_at?"Next event · "+new Date(row.next_event_at).toLocaleString():"No upcoming event scheduled"}</span></div>
      </article>)}
      {!rows.length&&!loading&&<div className="course-empty">No community projects yet. Build the first blueprint in Builder.</div>}
    </div>
  </section>;
}
