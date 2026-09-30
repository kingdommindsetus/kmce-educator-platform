"use client";

import {useRef,useState} from "react";
import {PEGASUS_AVATAR_PACK_V1} from "../lib/pegasus-avatar-registry";
import VoiceOrb from "./VoiceOrb";

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

type PreparedDaily={
  reports:DailyReport[];
  meetingId:number|null;
};

type HistoryReport={
  agent_name:string;
  department:string|null;
  speaking_order:number|null;
  win:string|null;
  blocker:string|null;
  next_action:string|null;
  ask_of_team:string|null;
  evidence:{task_ids?:Array<number|string>}|null;
};

type HistoryAction={
  id:number;
  source_agent:string|null;
  assigned_agent:string;
  title:string;
  instruction:string;
  priority:string;
  authority:string;
  status:string;
  metadata:Record<string,unknown>|null;
};

type HistoryMeeting={
  id:number;
  meeting_date:string;
  meeting_type:string;
  timezone:string;
  status:string;
  summary:string|null;
  started_at:string|null;
  completed_at:string|null;
  created_at:string;
  notion_sync_status:string;
  notion_page_id:string|null;
  notion_page_url:string|null;
  notion_synced_at:string|null;
  notion_sync_error:string|null;
  reports:HistoryReport[];
  actions:HistoryAction[];
};

export default function PegasusHuddle(){
  const [activeIndex,setActiveIndex]=useState(0);
  const [running,setRunning]=useState(false);
  const [speechText,setSpeechText]=useState("Give your Huddle update: one win, one blocker, and your next move.");
  const [speechStatus,setSpeechStatus]=useState("READY");
  const [dailyReports,setDailyReports]=useState<DailyReport[]>([]);
  const [meetingStatus,setMeetingStatus]=useState("NOT PREPARED");
  const [meetingId,setMeetingId]=useState<number|null>(null);
  const [history,setHistory]=useState<HistoryMeeting[]>([]);
  const [historyStatus,setHistoryStatus]=useState("NOT LOADED");
  const [selectedHistoryId,setSelectedHistoryId]=useState<number|null>(null);

  const audioRef=useRef<HTMLAudioElement|null>(null);
  const stopRequestedRef=useRef(false);
  const playbackResolveRef=useRef<(()=>void)|null>(null);

  const active=PEGASUS_AVATAR_PACK_V1[activeIndex];

  function resolvePlayback(){
    if(playbackResolveRef.current){
      const finish=playbackResolveRef.current;
      playbackResolveRef.current=null;
      finish();
    }
  }

  function stopPlayback(){
    stopRequestedRef.current=true;
    if(audioRef.current){
      audioRef.current.pause();
      audioRef.current.currentTime=0;
      audioRef.current=null;
    }
    resolvePlayback();
    setRunning(false);
  }

  function activate(index:number){
    stopPlayback();
    setActiveIndex(index);
    setSpeechStatus("READY");
  }

  function next(){
    activate((activeIndex+1)%PEGASUS_AVATAR_PACK_V1.length);
  }

  async function requestSpeech(agentId:string,text:string){
    const r=await fetch("/api/pegasus/speak",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({agent_id:agentId,text}),
    });
    const data=await r.json();
    if(!r.ok) throw new Error(data?.error||"Voice generation failed");
    return data;
  }

  async function playAgent(index:number,text:string){
    stopRequestedRef.current=false;
    setActiveIndex(index);
    setSpeechStatus("GENERATING VOICE");
    await new Promise(resolve=>setTimeout(resolve,80));

    const target=PEGASUS_AVATAR_PACK_V1[index];
    const data=await requestSpeech(target.id,text);

    return new Promise<void>((resolve,reject)=>{
      playbackResolveRef.current=resolve;
      const audio=new Audio(`data:${data.content_type||"audio/mpeg"};base64,${data.audio_base64}`);
      audioRef.current=audio;

      audio.onplay=()=>{
        setRunning(true);
        setSpeechStatus("SPEAKING");
      };

      audio.onended=()=>{
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

  async function speak(){
    const text=speechText.trim();
    if(!text) return;
    stopPlayback();
    try{
      await playAgent(activeIndex,text);
    }catch(error){
      setRunning(false);
      setSpeechStatus(error instanceof Error?error.message:"VOICE ERROR");
    }
  }

  async function loadDailyReports():Promise<PreparedDaily>{
    setMeetingStatus("PREPARING");
    const r=await fetch("/api/pegasus/daily/prepare",{method:"POST"});
    const data=await r.json();
    if(!r.ok) throw new Error(data?.error||"Could not prepare Huddle");

    const reports=(data.reports||[]) as DailyReport[];
    const preparedMeetingId=Number(data.meeting_id)||null;
    setDailyReports(reports);
    setMeetingId(preparedMeetingId);
    setMeetingStatus("READY");
    return {reports,meetingId:preparedMeetingId};
  }

  async function updateMeetingStatus(
    status:"RUNNING"|"COMPLETED"|"FAILED"|"CANCELLED",
    id:number|null=meetingId,
  ){
    if(!id) return;
    const r=await fetch("/api/pegasus/daily/status",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({meeting_id:id,status}),
    });
    const data=await r.json();
    if(!r.ok) throw new Error(data?.error||"Could not update meeting status");
  }

  async function prepareDaily(){
    try{
      await loadDailyReports();
    }catch(error){
      setMeetingStatus(error instanceof Error?error.message:"PREPARE FAILED");
    }
  }

  async function runDaily(){
    let activeMeetingId=meetingId;
    try{
      stopRequestedRef.current=false;
      let reports=dailyReports;

      if(!reports.length||!activeMeetingId){
        const prepared=await loadDailyReports();
        reports=prepared.reports;
        activeMeetingId=prepared.meetingId;
      }

      await updateMeetingStatus("RUNNING",activeMeetingId);
      setMeetingStatus("RUNNING");

      for(let i=0;i<reports.length;i++){
        if(stopRequestedRef.current) break;
        const report=reports[i];
        const index=PEGASUS_AVATAR_PACK_V1.findIndex(agent=>agent.id===report.agent_id);
        if(index<0) continue;

        const nextName=reports[i+1]?.agent_name||"Simon";
        const handoff=i<reports.length-1
          ? "Hey "+nextName+", you’re up next."
          : "Hey Simon, you’re up next to close us out.";

        // Strip any legacy handoff from prepared text. Handoffs are spoken
        // as a separate audio turn so every agent reliably introduces the next.
        const baseScript=report.script
          .replace(/\s*(?:Hey\s+)?[A-Za-z]+,\s+you(?:’|')?re up(?: next)?(?: to close us out)?\.\s*$/i,"")
          .trim();

        try{
          await playAgent(index,baseScript);
          if(stopRequestedRef.current) break;
          await new Promise(resolve=>setTimeout(resolve,220));
          await playAgent(index,handoff);
          await new Promise(resolve=>setTimeout(resolve,420));
        }catch(error){
          setRunning(false);
          setSpeechStatus((error instanceof Error?error.message:"VOICE ERROR")+" · CONTINUING");
          await new Promise(resolve=>setTimeout(resolve,700));
        }
      }

      if(!stopRequestedRef.current){
        const simonIndex=PEGASUS_AVATAR_PACK_V1.findIndex(agent=>agent.id==="simon");
        if(simonIndex>=0){
          await new Promise(resolve=>setTimeout(resolve,450));
          await playAgent(
            simonIndex,
            "Thank you, team. Kimberly, that concludes today’s Huddle. The priorities, blockers, and next moves are captured. Meeting closed."
          );
        }
      }

      if(stopRequestedRef.current){
        await updateMeetingStatus("CANCELLED",activeMeetingId);
        setMeetingStatus("STOPPED");
      }else{
        await updateMeetingStatus("COMPLETED",activeMeetingId);
        setMeetingStatus("COMPLETED");
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
  async function loadHistory(){
    setHistoryStatus("LOADING");
    try{
      const r=await fetch("/api/pegasus/daily/history");
      const data=await r.json();
      if(!r.ok) throw new Error(data?.error||"Could not load meeting history");
      const meetings=(data.meetings||[]) as HistoryMeeting[];
      setHistory(meetings);
      setSelectedHistoryId(meetings[0]?.id??null);
      setHistoryStatus(meetings.length?"READY":"EMPTY");
    }catch(error){
      setHistoryStatus(error instanceof Error?error.message:"HISTORY FAILED");
    }
  }

  const selectedHistory=history.find(item=>item.id===selectedHistoryId)||null;

  return <div className="panel">
    <div className="eyebrow">HUDDLE · LIVE VOICE ORB · SPEECH V1</div>
    <h2>AI Team Huddle</h2>
    <p className="muted">One active speaker at a time. Pegasus prepares evidence-based WIN / BLOCKER / NEXT / ASK reports and keeps each handoff traceable.</p>

    <div className="tomorrow" style={{marginTop:14}}>
      <div className="eyebrow">HUDDLE AUTO RUN</div>
      <p><b>Meeting:</b> {meetingStatus}</p>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <button className="btn" onClick={prepareDaily}>Prepare Daily</button>
        <button className="btn primary" onClick={runDaily} disabled={meetingStatus==="RUNNING"}>Run Daily</button>
        <button className="btn" onClick={stopMeeting}>Stop Meeting</button>
      </div>
      {dailyReports.length>0&&<div className="muted" style={{fontSize:12,marginTop:8}}>
        {dailyReports.length} reports prepared from internal task evidence{meetingId?` · Meeting #${meetingId}`:""}. Spoken reports do not create external effects.
      </div>}
    </div>

    <div className="tomorrow" style={{marginTop:14}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}>
        <div>
          <div className="eyebrow">MEETING HISTORY</div>
          <div className="muted" style={{fontSize:12}}>Founder-only audit trail of persisted Huddle meetings and agent reports.</div>
        </div>
        <button className="btn" onClick={loadHistory}>Load History</button>
      </div>
      <p><b>History:</b> {historyStatus}</p>

      {history.length>0&&<div style={{display:"grid",gridTemplateColumns:"minmax(220px,0.8fr) minmax(0,2fr)",gap:14}}>
        <div>
          {history.map(item=>
            <button
              key={item.id}
              className={"agent-chip "+(selectedHistoryId===item.id?"active":"")}
              onClick={()=>setSelectedHistoryId(item.id)}
              style={{width:"100%",marginTop:8,textAlign:"left"}}
            >
              <span className="avatar">🗂️</span>
              <span>
                <b>{item.meeting_date}</b>
                <small>#{item.id} · {item.status}</small>
              </span>
              <em>{item.reports.length}</em>
            </button>
          )}
        </div>

        <div style={{border:"1px solid var(--line)",padding:14}}>
          {selectedHistory?<>
            <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",flexWrap:"wrap"}}>
              <div>
                <div className="eyebrow">{selectedHistory.meeting_type}</div>
                <h3 style={{margin:"4px 0"}}>{selectedHistory.meeting_date}</h3>
              </div>
              <span className="pill">{selectedHistory.status}</span>
            </div>
            <div className="muted" style={{fontSize:12,marginBottom:10}}>
              Meeting #{selectedHistory.id} · {selectedHistory.timezone}
            </div>
            <div className="tomorrow" style={{marginBottom:12}}>
              <div className="eyebrow">NOTION ARCHIVE</div>
              <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                <span className="pill">{selectedHistory.notion_sync_status||"NOT_CONFIGURED"}</span>
                {selectedHistory.notion_page_url&&<a className="btn" href={selectedHistory.notion_page_url} target="_blank" rel="noreferrer">Open Notion Page</a>}
              </div>
              {selectedHistory.notion_sync_error&&<div className="muted" style={{fontSize:12,marginTop:6}}>{selectedHistory.notion_sync_error}</div>}
            </div>
            {selectedHistory.summary&&<div className="tomorrow" style={{marginBottom:12}}>
              <div className="eyebrow">EXECUTIVE NOTES</div>
              <pre style={{whiteSpace:"pre-wrap",fontFamily:"inherit",margin:0}}>{selectedHistory.summary}</pre>
            </div>}
            {selectedHistory.actions?.length>0&&<div className="tomorrow" style={{marginBottom:12}}>
              <div className="eyebrow">ACTION QUEUE</div>
              {selectedHistory.actions.map(action=><div key={action.id} style={{borderTop:"1px solid var(--line)",padding:"8px 0"}}>
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                  <b>{action.assigned_agent}</b>
                  <span className="pill">{action.priority}</span>
                  <span className="pill">{action.authority}</span>
                  <span className="pill">{action.status}</span>
                </div>
                <div style={{marginTop:4}}>{action.title}</div>
                <div className="muted" style={{fontSize:12,marginTop:2}}>{action.instruction}</div>
              </div>)}
            </div>}
            {selectedHistory.reports.map(report=>
              <details key={report.agent_name} style={{borderTop:"1px solid var(--line)",padding:"10px 0"}}>
                <summary style={{cursor:"pointer"}}><b>{report.agent_name}</b>{report.department?" · "+report.department:""}</summary>
                <p><b>WIN:</b> {report.win||"—"}</p>
                <p><b>BLOCKER:</b> {report.blocker||"—"}</p>
                <p><b>NEXT:</b> {report.next_action||"—"}</p>
                <p><b>ASK:</b> {report.ask_of_team||"—"}</p>
                <div className="muted" style={{fontSize:12}}>
                  Evidence task IDs: {report.evidence?.task_ids?.length?report.evidence.task_ids.join(", "):"none recorded"}
                </div>
              </details>
            )}
          </>:<div className="muted">Select a meeting.</div>}
        </div>
      </div>}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"minmax(0,2fr) minmax(280px,1fr)",gap:18,marginTop:18}}>
      <div style={{border:"1px solid var(--line)",padding:16,minHeight:360}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",marginBottom:12}}>
          <div>
            <div className="eyebrow">{running?"NOW SPEAKING":"READY"}</div>
            <h2 style={{margin:"4px 0"}}>{active.name}</h2>
            <div className="muted">{active.role}</div>
          </div>
          <span className="pill">{speechStatus}</span>
        </div>

        <VoiceOrb
          agentName={active.name}
          state={speechStatus==="SPEAKING"?"speaking":speechStatus==="GENERATING VOICE"?"thinking":speechStatus.includes("ERROR")?"error":"idle"}
          size={270}
        />

        <div style={{marginTop:14}}>
          <div className="eyebrow">MANUAL SPEECH</div>
          <textarea
            value={speechText}
            onChange={e=>setSpeechText(e.target.value)}
            maxLength={1200}
            rows={4}
            style={{width:"100%",marginTop:8,padding:12,resize:"vertical"}}
          />
          <div className="muted" style={{fontSize:12,marginTop:4}}>{speechText.length}/1200 characters</div>
        </div>

        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:12}}>
          <button className="btn primary" onClick={speak} disabled={speechStatus==="GENERATING VOICE"}>Speak as {active.name}</button>
          <button className="btn" onClick={next}>Next speaker</button>
          <button className="btn" onClick={stopPlayback}>Stop</button>
        </div>

        {dailyReports.find(r=>r.agent_id===active.id)&&(()=>{
          const report=dailyReports.find(r=>r.agent_id===active.id)!;
          return <div className="tomorrow" style={{marginTop:16}}>
            <div className="eyebrow">PREPARED REPORT</div>
            <p><b>WIN:</b> {report.win}</p>
            <p><b>BLOCKER:</b> {report.blocker}</p>
            <p><b>NEXT:</b> {report.next}</p>
            <p><b>ASK:</b> {report.ask}</p>
          </div>;
        })()}

        <div className="tomorrow" style={{marginTop:16}}>
          <div className="eyebrow">PRESENTATION PROFILE</div>
          <p><b>Voice ID:</b> <code>{active.voiceId}</code></p>
                    <p className="muted">{active.personality}</p>
          <p className="muted"><b>Voice visualization:</b> live orb state follows listening, thinking and speaking activity.</p>
        </div>
      </div>

      <div>
        <div className="eyebrow">SPEAKER QUEUE</div>
        {PEGASUS_AVATAR_PACK_V1.map((person,index)=>
          <button
            key={person.id}
            className={"agent-chip "+(index===activeIndex?"active":"")}
            onClick={()=>activate(index)}
            style={{width:"100%",marginTop:8,textAlign:"left"}}
          >
            <span className="avatar">{index===activeIndex&&running?"🟢":"⚪"}</span>
            <span><b>{person.name}</b><small>{person.role}</small></span>
            <em>{index+1}</em>
          </button>
        )}
      </div>
    </div>
  </div>;
}
