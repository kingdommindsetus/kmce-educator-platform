"use client";

import {useRef,useState} from "react";
import {NERVS_AVATAR_PACK_V1,avatarMediaUrl} from "../lib/nervs-avatar-registry";

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

type Props={
  onOpenHistory?:()=>void;
};

export default function NervsMeetingHall({onOpenHistory}:Props){
  const [reports,setReports]=useState<DailyReport[]>([]);
  const [meetingId,setMeetingId]=useState<number|null>(null);
  const [meetingStatus,setMeetingStatus]=useState("NOT PREPARED");
  const [activeAgentId,setActiveAgentId]=useState<string>("simon");
  const [speechStatus,setSpeechStatus]=useState("READY");
  const [notesStatus,setNotesStatus]=useState("NOT FINALIZED");
  const [running,setRunning]=useState(false);

  const audioRef=useRef<HTMLAudioElement|null>(null);
  const videoRefs=useRef<Record<string,HTMLVideoElement|null>>({});
  const stopRequestedRef=useRef(false);
  const playbackResolveRef=useRef<(()=>void)|null>(null);

  const activeReport=reports.find(report=>report.agent_id===activeAgentId)||null;
  const activeAgent=NERVS_AVATAR_PACK_V1.find(agent=>agent.id===activeAgentId)||NERVS_AVATAR_PACK_V1[0];

  function resolvePlayback(){
    if(playbackResolveRef.current){
      const done=playbackResolveRef.current;
      playbackResolveRef.current=null;
      done();
    }
  }

  function pauseAllVideos(){
    for(const video of Object.values(videoRefs.current)){
      if(!video) continue;
      video.pause();
      video.currentTime=0;
    }
  }

  function stopPlayback(){
    stopRequestedRef.current=true;
    if(audioRef.current){
      audioRef.current.pause();
      audioRef.current.currentTime=0;
      audioRef.current=null;
    }
    pauseAllVideos();
    resolvePlayback();
    setRunning(false);
    setSpeechStatus("STOPPED");
  }

  async function requestSpeech(agentId:string,text:string){
    const r=await fetch("/api/nervs/speak",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({agent_id:agentId,text}),
    });
    const data=await r.json();
    if(!r.ok) throw new Error(data?.error||"Voice generation failed");
    return data;
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
    setMeetingId(Number(data.meeting_id)||null);
    setMeetingStatus("READY");
    setNotesStatus("NOT FINALIZED");
    if(nextReports[0]) setActiveAgentId(nextReports[0].agent_id);
    return {reports:nextReports,meetingId:Number(data.meeting_id)||null};
  }

  async function playAgent(report:DailyReport){
    setActiveAgentId(report.agent_id);
    setSpeechStatus("GENERATING VOICE");
    const data=await requestSpeech(report.agent_id,report.script);

    return new Promise<void>((resolve,reject)=>{
      playbackResolveRef.current=resolve;
      const audio=new Audio(`data:${data.content_type||"audio/mpeg"};base64,${data.audio_base64}`);
      audioRef.current=audio;
      const video=videoRefs.current[report.agent_id];

      audio.onplay=()=>{
        setRunning(true);
        setSpeechStatus("SPEAKING");
        pauseAllVideos();
        if(video){
          video.muted=true;
          video.loop=true;
          video.currentTime=0;
          video.play().catch(()=>{});
        }
      };

      audio.onended=()=>{
        if(video){
          video.pause();
          video.currentTime=0;
        }
        audioRef.current=null;
        playbackResolveRef.current=null;
        setRunning(false);
        setSpeechStatus("COMPLETE");
        resolve();
      };

      audio.onerror=()=>{
        playbackResolveRef.current=null;
        setRunning(false);
        setSpeechStatus("AUDIO ERROR");
        reject(new Error("Audio playback failed"));
      };

      audio.play().catch(error=>{
        playbackResolveRef.current=null;
        reject(error);
      });
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
      }

      await updateMeetingStatus("RUNNING",activeMeetingId);
      setMeetingStatus("RUNNING");

      for(const report of activeReports){
        if(stopRequestedRef.current) break;
        await playAgent(report);
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
        <div className="eyebrow">NERVS · VIRTUAL BOARDROOM</div>
        <h2 style={{margin:"4px 0"}}>Meeting Hall</h2>
        <p className="muted" style={{maxWidth:760}}>
          Watch the full KMCE AI workforce report in sequence. All 12 agents remain visible; one speaker is live at a time.
          Reports are evidence-based and speaking does not create external effects.
        </p>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <span className="pill">Meeting {meetingId?`#${meetingId}`:"—"}</span>
        <span className="pill">{meetingStatus}</span>
        <span className="pill">Notes: {notesStatus}</span>
      </div>
    </div>

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
            const media=avatarMediaUrl(agent.id);
            const isActive=agent.id===activeAgentId;
            return <button
              key={agent.id}
              onClick={()=>setActiveAgentId(agent.id)}
              style={{
                padding:0,
                textAlign:"left",
                border:isActive?"2px solid currentColor":"1px solid var(--line)",
                background:"var(--panel)",
                cursor:"pointer",
                overflow:"hidden",
                position:"relative"
              }}
            >
              <div style={{position:"relative",aspectRatio:"16 / 9",background:"#050505"}}>
                {media
                  ? <video
                      ref={node=>{videoRefs.current[agent.id]=node;}}
                      src={media}
                      playsInline
                      muted
                      preload="metadata"
                      style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}
                    />
                  : <div style={{height:"100%",display:"grid",placeItems:"center",fontSize:34}}>🎙️</div>}
                <div style={{position:"absolute",left:8,top:8}}>
                  <span className="pill">{isActive&&running?"LIVE":"LISTENING"}</span>
                </div>
              </div>
              <div style={{padding:10}}>
                <b>{agent.name}</b>
                <div className="muted" style={{fontSize:11,marginTop:2}}>{agent.role}</div>
              </div>
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
            One speaker at a time. All others remain visible as listeners. Meeting speech is informational only; controlled actions require the authority workflow.
          </p>
        </div>
      </aside>
    </div>
  </div>;
}
