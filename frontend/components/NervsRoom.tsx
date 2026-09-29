"use client";

import {useMemo,useRef,useState} from "react";
import {NERVS_AVATAR_PACK_V1,avatarMediaUrl} from "../lib/nervs-avatar-registry";

export default function NervsRoom(){
  const [activeIndex,setActiveIndex]=useState(0);
  const [running,setRunning]=useState(false);
  const videoRef=useRef<HTMLVideoElement|null>(null);
  const active=NERVS_AVATAR_PACK_V1[activeIndex];
  const mediaUrl=useMemo(()=>avatarMediaUrl(active.id),[active.id]);

  function activate(index:number){
    setActiveIndex(index);
    setRunning(true);
    setTimeout(()=>videoRef.current?.play().catch(()=>{}),0);
  }

  function next(){
    const nextIndex=(activeIndex+1)%NERVS_AVATAR_PACK_V1.length;
    activate(nextIndex);
  }

  function stop(){
    setRunning(false);
    videoRef.current?.pause();
  }

  return <div className="panel">
    <div className="eyebrow">NERVS DAILY · AVATAR PACK V1</div>
    <h2>Speaker Room</h2>
    <p className="muted">One active speaker at a time. NERVS owns turn-taking; speaking alone never triggers an external action.</p>

    <div style={{display:"grid",gridTemplateColumns:"minmax(0,2fr) minmax(280px,1fr)",gap:18,marginTop:18}}>
      <div style={{border:"1px solid var(--line)",padding:16,minHeight:360}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",marginBottom:12}}>
          <div>
            <div className="eyebrow">{running?"NOW SPEAKING":"READY"}</div>
            <h2 style={{margin:"4px 0"}}>{active.name}</h2>
            <div className="muted">{active.role}</div>
          </div>
          <span className="pill">{running?"LIVE":"IDLE"}</span>
        </div>

        {mediaUrl
          ? <video
              key={mediaUrl}
              ref={videoRef}
              src={mediaUrl}
              playsInline
              controls
              onEnded={next}
              style={{width:"100%",aspectRatio:"16 / 9",objectFit:"cover",background:"#050505"}}
            />
          : <div style={{aspectRatio:"16 / 9",display:"grid",placeItems:"center",background:"#070707",border:"1px dashed var(--line)",padding:24,textAlign:"center"}}>
              <div>
                <div style={{fontSize:52}}>🎙️</div>
                <b>{active.name} motion reference received</b>
                <p className="muted" style={{maxWidth:520}}>Set NEXT_PUBLIC_NERVS_AVATAR_BASE_URL to the stable media location. NERVS will load {active.id}.mp4 without changing speaker logic.</p>
              </div>
            </div>}

        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:12}}>
          <button className="btn primary" onClick={()=>activate(activeIndex)}>Activate {active.name}</button>
          <button className="btn" onClick={next}>Next speaker</button>
          <button className="btn" onClick={stop}>Stop</button>
        </div>

        <div className="tomorrow" style={{marginTop:16}}>
          <div className="eyebrow">PRESENTATION PROFILE</div>
          <p><b>Voice ID:</b> <code>{active.voiceId}</code></p>
          <p><b>Motion reference:</b> {active.referenceFile}</p>
          <p className="muted">{active.personality}</p>
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
