"use client";

import {useMemo,useRef,useState} from "react";
import {NERVS_AVATAR_PACK_V1,avatarMediaUrl} from "../lib/nervs-avatar-registry";

export default function NervsRoom(){
  const [activeIndex,setActiveIndex]=useState(0);
  const [running,setRunning]=useState(false);
  const [speechText,setSpeechText]=useState("Give your NERVS DAILY update: one win, one blocker, and your next move.");
  const [speechStatus,setSpeechStatus]=useState("READY");
  const videoRef=useRef<HTMLVideoElement|null>(null);
  const audioRef=useRef<HTMLAudioElement|null>(null);
  const active=NERVS_AVATAR_PACK_V1[activeIndex];
  const mediaUrl=useMemo(()=>avatarMediaUrl(active.id),[active.id]);

  function activate(index:number){
    stopPlayback();
    setActiveIndex(index);
    setSpeechStatus("READY");
  }

  function next(){
    const nextIndex=(activeIndex+1)%NERVS_AVATAR_PACK_V1.length;
    activate(nextIndex);
  }

  function stopPlayback(){
    if(audioRef.current){
      audioRef.current.pause();
      audioRef.current.currentTime=0;
      audioRef.current=null;
    }
    if(videoRef.current){
      videoRef.current.pause();
      videoRef.current.currentTime=0;
    }
    setRunning(false);
  }

  async function speak(){
    const text=speechText.trim();
    if(!text) return;
    stopPlayback();
    setSpeechStatus("GENERATING VOICE");

    try{
      const r=await fetch("/api/nervs/speak",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({agent_id:active.id,text}),
      });
      const data=await r.json();
      if(!r.ok) throw new Error(data?.error||"Voice generation failed");

      const audio=new Audio(`data:${data.content_type||"audio/mpeg"};base64,${data.audio_base64}`);
      audioRef.current=audio;
      audio.onplay=()=>{
        setRunning(true);
        setSpeechStatus("SPEAKING");
        if(videoRef.current){
          videoRef.current.muted=true;
          videoRef.current.loop=true;
          videoRef.current.currentTime=0;
          videoRef.current.play().catch(()=>{});
        }
      };
      audio.onended=()=>{
        if(videoRef.current){
          videoRef.current.pause();
          videoRef.current.currentTime=0;
        }
        setRunning(false);
        setSpeechStatus("COMPLETE");
      };
      audio.onerror=()=>{
        setRunning(false);
        setSpeechStatus("AUDIO ERROR");
      };
      await audio.play();
    }catch(error){
      setRunning(false);
      setSpeechStatus(error instanceof Error?error.message:"VOICE ERROR");
    }
  }

  return <div className="panel">
    <div className="eyebrow">NERVS DAILY · AVATAR PACK V1 · SPEECH V1</div>
    <h2>Speaker Room</h2>
    <p className="muted">One active speaker at a time. NERVS owns turn-taking. The reference motion loops silently while the selected agent voice speaks generated text.</p>

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

        {mediaUrl
          ? <video
              key={mediaUrl}
              ref={videoRef}
              src={mediaUrl}
              playsInline
              muted
              preload="metadata"
              style={{width:"100%",aspectRatio:"16 / 9",objectFit:"cover",background:"#050505"}}
            />
          : <div style={{aspectRatio:"16 / 9",display:"grid",placeItems:"center",background:"#070707",border:"1px dashed var(--line)",padding:24,textAlign:"center"}}>
              <div>
                <div style={{fontSize:52}}>🎙️</div>
                <b>{active.name} motion reference unavailable</b>
              </div>
            </div>}

        <div style={{marginTop:14}}>
          <div className="eyebrow">NERVS SPEECH TEST</div>
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

        <div className="tomorrow" style={{marginTop:16}}>
          <div className="eyebrow">PRESENTATION PROFILE</div>
          <p><b>Voice ID:</b> <code>{active.voiceId}</code></p>
          <p><b>Motion reference:</b> {active.referenceFile}</p>
          <p className="muted">{active.personality}</p>
          <p className="muted"><b>Speech v1:</b> motion-loop synchronization, not word-level lip sync.</p>
        </div>
      </div>

      <div>
        <div className="eyebrow">SPEAKER QUEUE</div>
        {NERVS_AVATAR_PACK_V1.map((person,index)=>
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
