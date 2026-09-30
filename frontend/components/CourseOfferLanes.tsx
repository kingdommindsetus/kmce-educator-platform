"use client";
import {useEffect,useState} from "react";
import {courseDisplayLabel} from "../lib/course-labels";

const laneLabels:any={DIGITAL:"Digital Toolkit",LIVE_IN_PERSON:"Live In-Person Seminar",LIVE_IN_OFFICE:"Premium In-Office Training",ONLINE:"Live Online / On-Demand"};
const laneIcons:any={DIGITAL:"01",LIVE_IN_PERSON:"02",LIVE_IN_OFFICE:"03",ONLINE:"04"};
const money=(minor:any)=>minor==null?"":String(Number(minor)/100);

export default function CourseOfferLanes({course}:{course:any}){
  const [offers,setOffers]=useState<any[]>([]);const [notice,setNotice]=useState("");
  async function load(){
    if(!course?.course_code)return;
    const r=await fetch(`/api/courses/${encodeURIComponent(course.course_code)}/offers`);
    const d=await r.json().catch(()=>null);
    if(!r.ok){setNotice(d?.error||"Could not load offer lanes");return;}
    setOffers((d.offers||[]).map((x:any)=>({...x,proposed_price_minor:money(x.proposed_price_minor)})));
    setNotice(d.seeded?"":"Draft plan · save once to create the four controlled offers.");
  }
  useEffect(()=>{void load();},[course?.course_code]);
  function change(i:number,key:string,value:any){setOffers(all=>all.map((x,n)=>n===i?{...x,[key]:value}:x));}
  async function save(){
    const payload=offers.map(x=>({...x,proposed_price_minor:x.proposed_price_minor===""?null:Math.round(Number(x.proposed_price_minor)*100)}));
    setNotice("Saving controlled offers…");
    const r=await fetch(`/api/courses/${encodeURIComponent(course.course_code)}/offers`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({offers:payload})});
    const d=await r.json().catch(()=>null);
    if(!r.ok){setNotice(d?.error||"Could not save offer lanes");return;}
    setOffers((d.offers||[]).map((x:any)=>({...x,proposed_price_minor:money(x.proposed_price_minor)})));
    setNotice("OFFERS SAVED · PRICES REMAIN INTERNAL UNTIL APPROVED FOR LAUNCH");
  }

  return <section className="course-tab-page">
    <div className="course-section-head"><div><div className="eyebrow">FACULTY REVENUE MODEL</div><h3>{courseDisplayLabel(course)}</h3></div><span className="course-block-tag">4 CONTROLLED OFFERS</span></div>
    <p className="course-tab-intro">Each offer has its own lifecycle, price, CE request and next action. Digital products remain non-CE unless separately authorized.</p>

    <div className="offer-grid">
      {offers.map((offer,i)=><article className="offer-card" key={offer.lane}>
        <div className="offer-card-head"><div className="offer-number">{laneIcons[offer.lane]||String(i+1).padStart(2,"0")}</div><div><small>{offer.ce_credit_offered?"CE REQUESTED":"NON-CE / PENDING"}</small><h4>{laneLabels[offer.lane]||offer.lane}</h4></div><em>{String(offer.offer_status||"IDEA").replaceAll("_"," ")}</em></div>
        <label className="course-field"><span>Offer Name</span><input value={offer.offer_name||""} onChange={e=>change(i,"offer_name",e.target.value)} placeholder={laneLabels[offer.lane]}/></label>
        <label className="course-field"><span>Offer Description</span><textarea value={offer.description||""} onChange={e=>change(i,"description",e.target.value)} placeholder="What the client receives and how this offer is delivered."/></label>
        <div className="offer-controls">
          <label className="course-field"><span>Proposed Price ($)</span><input type="number" min="0" step="0.01" value={offer.proposed_price_minor??""} onChange={e=>change(i,"proposed_price_minor",e.target.value)}/></label>
          <label className="course-field"><span>Status</span><select value={offer.offer_status||"IDEA"} onChange={e=>change(i,"offer_status",e.target.value)}>{["IDEA","DEVELOPMENT","REVIEW","READY_TO_LAUNCH","LIVE","PAUSED","RETIRED"].map(s=><option key={s} value={s}>{s.replaceAll("_"," ")}</option>)}</select></label>
        </div>
        <label className="offer-check"><input type="checkbox" checked={Boolean(offer.ce_credit_offered)} onChange={e=>change(i,"ce_credit_offered",e.target.checked)}/><span><b>Request CE credit for this offer</b><small>Still requires KMCE internal authorization before CE can be represented publicly.</small></span></label>
        <label className="course-field"><span>Next Action</span><input value={offer.next_action||""} onChange={e=>change(i,"next_action",e.target.value)} placeholder="What must happen next?"/></label>
      </article>)}
    </div>
    <div className="course-save-row"><button className="btn primary" onClick={()=>void save()}>Save Revenue Model</button><span>Offers remain internal until launch approval.</span></div>
    {notice&&<p className="course-notice">{notice}</p>}
  </section>;
}
