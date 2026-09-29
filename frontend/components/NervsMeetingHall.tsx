"use client";

import {useRef,useState} from "react";
import {NERVS_AVATAR_PACK_V1} from "../lib/nervs-avatar-registry";
import NervsRoomConversation from "./NervsRoomConversation";

type DailyReport={
  agent_id:string;
  agent_name:string;
  win:string;
  blocker:string;
  next:string;
  ask:string;
  script:string;
  evidence_task_ids:Array<number|string>;
};

type QueueItem={
  key:string;
  agent_id:string;
  agent_name:string;
  script:string;
  closing?:boolean;
};

type TurnState="QUEUED"|"GENERATING"|"PLAYING"|"COMPLETE"|"SKIPPED"|"INTERRUPTED";
type TurnResult="complete"|"skipped"|"interrupted";
type AudioPayload={audio_base64:string;content_type?:string};

type Props={
  onOpenHistory?:()=>void;
};

const SPEAK_TIMEOUT_MS=27000;
const PLAYBACK_WATCHDOG_MS=120000;

function buildQueue(list:DailyReport[]):QueueItem[]{
  const roleOf=(id:string)=>NERVS_AVATAR_PACK_V1.find(a=>a.id===id)?.role||"";
  const items:QueueItem[]=list.map((r,i)=>{
    const next=list[i+1];
    let script=r.script.trim();
    if(next){
      if(!script.toLowerCase().includes(next.agent_name.toLowerCase())){
        const role=roleOf(next.agent_id);
        script+=` Next up is ${next.agent_name}${role?`, our ${role} lead`:""}. ${next.agent_name}, the floor is yours.`;
      }
    }else if(r.agent_id!=="simon"){
      script+=` Simon, back to you.`;
    }
    return {key:`${i}:${r.agent_id}`,agent_id:r.agent_id,agent_name:r.agent_name,script};
  });
  const last=list[list.length-1];
  if(!last||last.agent_id!=="simon"){
    items.push({key:`closing:simon`,agent_id:"simon",agent_name:"Simon",script:"",closing:true});
  }
  return items;
}

export default function NervsMeetingHall({onOpenHistory}:Props){
  const [reports,setReports]=useState<DailyReport[]>([]);
  const [meetingId,setMeetingId]=useState<number|null>(null);
  const [meetingStatus,setMeetingStatus]=useState("NOT PREPARED");
  const [activeAgentId,setActiveAgentId]=useState<string>("simon");
  const [speechStatus,setSpeechStatus]=useState<TurnState>("QUEUED");
  const [notesStatus,setNotesStatus]=useState("NOT FINALIZED");
  const [running,setRunning]=useState(false);
  const [turnStates,setTurnStates]=useState<Record<string,TurnState>>({});

  const audioRef=useRef<HTMLAudioElement|null>(null);
  const stopRequestedRef=useRef(false);
  const stopCurrentRef=useRef<(()=>void)|null>(null);
  const fetchAbortRefs=useRef<Set<AbortController>>(new Set());
  const meetingIdRef=useRef<number|null>(null);

  const activeReport=reports.find(report=>report.agent_id===activeAgentId)||null;
  const activeAgent=NERVS_AVATAR_PACK_V1.find(agent=>agent.id===activeAgentId)||NERVS_AVATAR_PACK_V1[0];

  function setTurn(turnId:string,state:TurnState){
    setTurnStates(current=>({...current,[turnId]:state}));
    setSpeechStatus(state);
  }

  function stopPlayback(){
    stopRequestedRef.current=true;
    for(const controller of fetchAbortRefs.current) controller.abort();
    fetchAbortRefs.current.clear();
    stopCurrentRef.current?.();
    stopCurrentRef.current=null;
    if(audioRef.current){
      audioRef.current.pause();
      audioRef.current.currentTime=0;
      audioRef.current=null;
    }
    setRunning(false);
    setSpeechStatus("INTERRUPTED");
  }

  async function fetchAudio(agentId:string,text:string,turnId:string):Promise<AudioPayload|null>{
    for(let attempt=1;attempt<=2;attempt++){
      const controller=new AbortController();
      fetchAbortRefs.current.add(controller);
      const timer=setTimeout(()=>controller.abort(),SPEAK_TIMEOUT_MS);
      try{
        const r=await fetch("/api/nervs/speak",{
          method:"POST",
          signal:controller.signal,
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({
            agent_id:agentId,
            text,
            meeting_id:meetingIdRef.current,
            turn_id:turnId,
          }),
        });
        const data=await r.json().catch(()=>null);
        if(r.ok&&data?.audio_base64){
          return {
            audio_base64:String(data.audio_base64),
            content_type:data.content_type?String(data.content_type):undefined,
          };
        }
      }catch{
        if(stopRequestedRef.current) return null;
      }finally{
        clearTimeout(timer);
        fetchAbortRefs.current.delete(controller);
      }
    }
    return null;
  }

  async function updateMeetingStatus(status:"RUNNING"|"COMPLETED"|"FAILED"|"CANCELLED",id:number|null=meetingId){
    if(!id) return;
    const r=await fetch("/api/nervs/daily/status",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({meeting_id:id,status}),
    });
    const data=await r.json();
    if(!r.ok) throw new Error(data?.error||"Could not update meeting status");
  }

  async function finalizeMeeting(id:number|null){
    if(!id) return;
    setNotesStatus("FINALIZING");
    const r=await fetch("/api/nervs/daily/finalize",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({meeting_id:id}),
    });
    const data=await r.json();
    if(!r.ok) throw new Error(data?.error||"Could not finalize meeting notes");
    setNotesStatus("SAVED · "+String(data.action_count||0)+" ACTION"+(Number(data.action_count)===1?"":"S")+" · NOTION "+String(data.notion_sync?.status||"NOT_CONFIGURED"));
  }

  async function prepareMeeting(){
    setMeetingStatus("PREPARING");
    const r=await fetch("/api/nervs/daily/prepare",{method:"POST"});
    const data=await r.json();
    if(!r.ok) throw new Error(data?.error||"Could not prepare NERVS Daily");
    const nextReports=(data.reports||[]) as DailyReport[];
    setReports(nextReports);
    const nextMeetingId=Number(data.meeting_id)||null;
    setMeetingId(nextMeetingId);
    meetingIdRef.current=nextMeetingId;
    setMeetingStatus("READY");
    setNotesStatus("NOT FINALIZED");
    setTurnStates({});
    if(nextReports[0]) setActiveAgentId(nextReports[0].agent_id);
    return {reports:nextReports,meetingId:nextMeetingId};
  }

  async function playTurn(item:QueueItem,script:string,pre?:Promise<AudioPayload|null>):Promise<TurnResult>{
    if(stopRequestedRef.current){
      setTurn(item.key,"INTERRUPTED");
      return "interrupted";
    }

    setActiveAgentId(item.agent_id);
    setTurn(item.key,"GENERATING");
    setSpeechStatus("GENERATING");
    const data=pre?await pre:await fetchAudio(item.agent_id,script,item.key);

    if(stopRequestedRef.current){
      setTurn(item.key,"INTERRUPTED");
      return "interrupted";
    }
    if(!data){
      setTurn(item.key,"SKIPPED");
      return "skipped";
    }

    return new Promise<TurnResult>(resolve=>{
      let settled=false;
      const audio=new Audio(`data:${data.content_type||"audio/mpeg"};base64,${data.audio_base64}`);
      audioRef.current=audio;

      const finish=(result:TurnResult)=>{
        if(settled) return;
        settled=true;
        clearTimeout(watchdog);
        audio.onplay=null;
        audio.onended=null;
        audio.onerror=null;
        audio.pause();
        if(audioRef.current===audio) audioRef.current=null;
        stopCurrentRef.current=null;
        setRunning(false);
        setTurn(item.key,result==="complete"?"COMPLETE":result==="interrupted"?"INTERRUPTED":"SKIPPED");
        resolve(result);
      };

      const watchdog=setTimeout(()=>finish("skipped"),PLAYBACK_WATCHDOG_MS);
      stopCurrentRef.current=()=>finish("interrupted");

      audio.onplay=()=>{
        setRunning(true);
        setTurn(item.key,"PLAYING");
      };
      audio.onended=()=>finish("complete");
      audio.onerror=()=>finish("skipped");
      audio.play().catch(()=>finish("skipped"));
    });
  }

  async function startMeeting(){
    let activeMeetingId=meetingId;
    try{
      stopRequestedRef.current=false;
      let activeReports=reports;
      if(!activeReports.length||!activeMeetingId){
        const prepared=await prepareMeeting();
        activeReports=prepared.reports;
        activeMeetingId=prepared.meetingId;
      }else{
        meetingIdRef.current=activeMeetingId;
      }

      await updateMeetingStatus("RUNNING",activeMeetingId);
      setMeetingStatus("RUNNING");

      const activeQueue=buildQueue(activeReports);
      const queued:Record<string,TurnState>={};
      activeQueue.forEach(item=>{queued[item.key]="QUEUED";});
      setTurnStates(queued);

      let skipped=0;
      const prefetch:Record<string,Promise<AudioPayload|null>>={};
      const warm=(it?:QueueItem)=>{
        if(!it||it.closing||prefetch[it.key]) return;
        prefetch[it.key]=fetchAudio(it.agent_id,it.script,it.key);
      };
      for(let i=0;i<activeQueue.length;i++){
        const item=activeQueue[i];
        if(stopRequestedRef.current) break;
        let script=item.script;
        if(item.closing){
          script=`That concludes today's NERVS Daily. ${skipped?`${skipped} report${skipped===1?"":"s"} could not be voiced and ${skipped===1?"was":"were"} skipped, but the written notes are saved. `:""}Thank you, team. Meeting adjourned.`;
        }
        warm(item);
        warm(activeQueue[i+1]);
        const result=await playTurn(item,script,prefetch[item.key]);
        if(result==="skipped") skipped++;
        if(result==="interrupted") break;
      }

      if(stopRequestedRef.current){
        await updateMeetingStatus("CANCELLED",activeMeetingId);
        setMeetingStatus("STOPPED");
      }else{
        await updateMeetingStatus("COMPLETED",activeMeetingId);
        setMeetingStatus("COMPLETED");
        try{
          await finalizeMeeting(activeMeetingId);
        }catch(error){
          setNotesStatus(error instanceof Error?error.message:"NOTES FAILED");
        }
      }
    }catch(error){
      await updateMeetingStatus("FAILED",activeMeetingId).catch(()=>{});
      setMeetingStatus(error instanceof Error?error.message:"MEETING FAILED");
      setRunning(false);
    }
  }

  async function stopMeeting(){
    stopPlayback();
    await updateMeetingStatus("CANCELLED").catch(()=>{});
    setMeetingStatus("STOPPED");
  }

  return <div className="panel">
    <div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"flex-start",flexWrap:"wrap"}}>
      <div>
        <div className="eyebrow">NERVS · VOICE BOARDROOM</div>
        <h2 style={{margin:"4px 0"}}>Meeting Hall</h2>
        <p className="muted" style={{maxWidth:760}}>
          Hear the full KMCE AI workforce report in sequence. One speaker is live at a time; failed turns are skipped so the meeting keeps moving.
        </p>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <span className="pill">Meeting {meetingId?`#${meetingId}`:"—"}</span>
        <span className="pill">{meetingStatus}</span>
        <span className="pill">Notes: {notesStatus}</span>
      </div>
    </div>

    <NervsRoomConversation onResponder={setActiveAgentId}/>

    <div style={{display:"flex",gap:8,flexWrap:"wrap",margin:"14px 0"}}>
      <button className="btn" onClick={()=>prepareMeeting().catch(error=>setMeetingStatus(error instanceof Error?error.message:"PREPARE FAILED"))}>Prepare Meeting</button>
      <button className="btn primary" onClick={startMeeting} disabled={meetingStatus==="RUNNING"}>Start Meeting</button>
      <button className="btn" onClick={stopMeeting}>Stop Meeting</button>
      {onOpenHistory&&<button className="btn" onClick={onOpenHistory}>Open Meeting History</button>}
    </div>

    <div style={{display:"grid",gridTemplateColumns:"minmax(0,2.2fr) minmax(300px,0.8fr)",gap:16}}>
      <div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10}}>
          {NERVS_AVATAR_PACK_V1.map(agent=>{
            const isActive=agent.id===activeAgentId;
            const matchingTurn=Object.entries(turnStates).find(([key])=>key.endsWith(`:${agent.id}`));
            const state=matchingTurn?.[1]||"QUEUED";
            return <button
              key={agent.id}
              onClick={()=>setActiveAgentId(agent.id)}
              style={{
                padding:12,
                textAlign:"left",
                border:isActive?"2px solid currentColor":"1px solid var(--line)",
                background:"var(--panel)",
                cursor:"pointer",
                minHeight:150,
                position:"relative"
              }}
            >
              <div style={{height:72,display:"grid",placeItems:"center"}}>
                <div style={{
                  width:isActive&&running?56:44,
                  height:isActive&&running?56:44,
                  borderRadius:"50%",
                  border:"2px solid currentColor",
                  display:"grid",
                  placeItems:"center",
                  transition:"all .2s ease"
                }}>🎙️</div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}>
                <b>{agent.name}</b>
                <span className="pill">{isActive?speechStatus:state}</span>
              </div>
              <div className="muted" style={{fontSize:11,marginTop:4}}>{agent.role}</div>
            </button>;
          })}
        </div>
      </div>

      <aside style={{border:"1px solid var(--line)",padding:14,minHeight:320}}>
        <div className="eyebrow">{running?"NOW SPEAKING":"SELECTED AGENT"}</div>
        <h2 style={{margin:"4px 0"}}>{activeAgent.name}</h2>
        <div className="muted">{activeAgent.role}</div>
        <div style={{marginTop:10}}><span className="pill">{speechStatus}</span></div>

        <div className="tomorrow" style={{marginTop:14}}>
          <div className="eyebrow">LIVE REPORT</div>
          {activeReport?<>
            <p><b>WIN:</b> {activeReport.win}</p>
            <p><b>BLOCKER:</b> {activeReport.blocker}</p>
            <p><b>NEXT:</b> {activeReport.next}</p>
            <p><b>ASK:</b> {activeReport.ask}</p>
            <div className="muted" style={{fontSize:12}}>
              Evidence task IDs: {activeReport.evidence_task_ids?.length?activeReport.evidence_task_ids.join(", "):"none recorded"}
            </div>
          </>:<p className="muted">Prepare the meeting to load this agent&apos;s report.</p>}
        </div>

        <div style={{marginTop:14}}>
          <div className="eyebrow">ROOM RULES</div>
          <p className="muted" style={{fontSize:12}}>
            Voice only. One speaker at a time. Successful turns advance on audio completion; failed turns are skipped, Stop interrupts the current turn, and Simon always closes the meeting.
          </p>
        </div>
      </aside>
    </div>
  </div>;
}
