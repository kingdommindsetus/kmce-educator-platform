"use client";

import {useEffect,useMemo,useState} from "react";

type VoiceOrbState="idle"|"listening"|"thinking"|"speaking"|"error";

type Props={
  agentName:string;
  state:VoiceOrbState;
  level?:number;
  size?:number;
};

export default function VoiceOrb({agentName,state,level=0,size=240}:Props){
  const [phase,setPhase]=useState(0);

  useEffect(()=>{
    let frame=0;
    let raf=0;
    const tick=()=>{
      frame+=1;
      setPhase(frame);
      raf=requestAnimationFrame(tick);
    };
    if(state==="speaking"||state==="listening") raf=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(raf);
  },[state]);

  const activity=useMemo(()=>{
    if(state==="speaking"){
      const synthetic=.22+.16*Math.sin(phase/7)+.08*Math.sin(phase/3.1);
      return Math.max(.08,Math.min(.48,level||synthetic));
    }
    if(state==="listening") return .12+.04*Math.sin(phase/12);
    if(state==="thinking") return .08;
    return .03;
  },[state,level,phase]);

  const scale=1+activity;
  const glow=24+activity*110;
  const label=state==="speaking"?"SPEAKING":state==="listening"?"LISTENING":state==="thinking"?"THINKING":state==="error"?"VOICE ERROR":"READY";

  return <div style={{display:"grid",placeItems:"center",padding:"26px 0 18px"}}>
    <div
      aria-label={agentName+" voice visualization"}
      style={{
        width:size,
        height:size,
        display:"grid",
        placeItems:"center",
        position:"relative",
      }}
    >
      <div style={{
        position:"absolute",
        width:"78%",
        height:"78%",
        borderRadius:"50%",
        background:"radial-gradient(circle at 35% 30%, rgba(255,231,172,.85) 0%, rgba(201,155,70,.38) 24%, rgba(74,47,13,.23) 52%, rgba(0,0,0,0) 72%)",
        filter:`blur(${18+activity*24}px)`,
        transform:`scale(${1.06+activity*.7})`,
        opacity:state==="error"?.28:.82,
        transition:"opacity .25s ease",
      }}/>
      <div style={{
        position:"absolute",
        width:"64%",
        height:"64%",
        borderRadius:"50%",
        background:"radial-gradient(circle at 38% 32%, #f6df9c 0%, #c9a85f 14%, #7d5b25 33%, #17120b 60%, #080808 78%)",
        border:"1px solid rgba(218,180,103,.42)",
        boxShadow:`0 0 ${glow}px rgba(218,180,103,.46), inset -18px -20px 36px rgba(0,0,0,.72), inset 10px 10px 26px rgba(255,238,186,.12)`,
        transform:`scale(${scale})`,
        transition:state==="speaking"?"transform 80ms linear, box-shadow 120ms ease":"transform 320ms ease, box-shadow 320ms ease",
      }}/>
      <div style={{
        position:"absolute",
        width:"38%",
        height:"38%",
        borderRadius:"50%",
        border:"1px solid rgba(255,226,156,.18)",
        transform:`scale(${1+activity*.55})`,
        boxShadow:"inset 0 0 26px rgba(255,225,155,.08)",
      }}/>
    </div>
    <div style={{textAlign:"center",marginTop:8}}>
      <div style={{fontSize:20,fontWeight:700}}>{agentName}</div>
      <div className="eyebrow" style={{marginTop:5}}>{label}</div>
    </div>
  </div>;
}
