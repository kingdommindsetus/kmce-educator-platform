"use client";

import {useRef,useState} from "react";

type Props={onResponder?:(agentId:string)=>void};

export default function NervsRoomConversation({onResponder}:Props){
  const [input,setInput]=useState("");
  const [status,setStatus]=useState("READY");
  const [reply,setReply]=useState("");
  const [responder,setResponder]=useState("");
  const [listening,setListening]=useState(false);
  const audioRef=useRef<HTMLAudioElement|null>(null);
  const recognitionRef=useRef<any>(null);

  function interrupt(){
    recognitionRef.current?.stop?.();
    if(audioRef.current){audioRef.current.pause();audioRef.current.currentTime=0;audioRef.current=null;}
    setStatus("READY");
  }

  async function speak(agentId:string,text:string){
    const r=await fetch("/api/nervs/speak",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({agent_id:agentId,text:text.slice(0,1200)})});
    const data=await r.json().catch(()=>({}));
    if(!r.ok){setStatus("TEXT READY · VOICE UNAVAILABLE");return;}
    const audio=new Audio("data:"+(data.content_type||"audio/mpeg")+";base64,"+data.audio_base64);
    audioRef.current=audio;
    audio.onplay=()=>setStatus(responder?responder.toUpperCase()+" SPEAKING":"SPEAKING");
    audio.onended=()=>{audioRef.current=null;setStatus("READY");};
    audio.onerror=()=>{audioRef.current=null;setStatus("VOICE ERROR");};
    await audio.play().catch(()=>setStatus("PLAYBACK BLOCKED"));
  }

  async function send(textOverride?:string,inputMode:"text"|"voice"="text"){
    const text=(textOverride??input).trim();
    if(!text||status==="THINKING") return;
    interrupt();
    setInput("");setReply("");setResponder("");setStatus("THINKING");
    const r=await fetch("/api/nervs/room/conversation",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:text,input_mode:inputMode})});
    const data=await r.json().catch(()=>({}));
    if(!r.ok){setStatus(data?.error==="LLM_NOT_CONFIGURED"?"LLM NOT CONFIGURED":data?.error||"ROOM ERROR");return;}
    const name=String(data.responder?.name||"");
    const id=String(data.responder?.id||"");
    const textReply=String(data.message?.content||"").trim();
    setResponder(name);setReply(textReply);
    if(id&&onResponder) onResponder(id);
    if(textReply&&id){setStatus("VOICE GENERATING");await speak(id,textReply);} else setStatus("READY");
  }

  function startListening(){
    interrupt();
    const w=window as any;
    const SR=w.SpeechRecognition||w.webkitSpeechRecognition;
    if(!SR){setStatus("MIC TRANSCRIPTION NOT SUPPORTED IN THIS BROWSER");return;}
    const rec=new SR();recognitionRef.current=rec;
    rec.lang="en-US";rec.interimResults=true;rec.continuous=false;
    let finalText="";
    rec.onstart=()=>{setListening(true);setStatus("LISTENING TO FOUNDER");};
    rec.onresult=(event:any)=>{let interim="";for(let i=event.resultIndex;i<event.results.length;i++){const t=String(event.results[i][0]?.transcript||"");if(event.results[i].isFinal) finalText+=t;else interim+=t;}setInput((finalText||interim).trim());};
    rec.onerror=()=>{setListening(false);setStatus("MIC ERROR");};
    rec.onend=()=>{setListening(false);const text=finalText.trim();if(text) void send(text,"voice");else setStatus("READY");};
    rec.start();
  }

  return <div className="tomorrow" style={{margin:"14px 0"}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}>
      <div><div className="eyebrow">FOUNDER · TALK TO THE ROOM</div><b>All 12 agents hear this turn</b><div className="muted" style={{fontSize:12}}>NERVS routes the first response; the broadcast is stored as shared memory.</div></div>
      <span className="pill">{status}</span>
    </div>
    <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
      <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter") void send();}} placeholder="Address the NERVS team…" style={{flex:"1 1 420px",padding:"12px 14px",background:"#090909",color:"white",border:"1px solid var(--line)"}}/>
      <button className="btn primary" onClick={()=>void send()}>Send to Room</button>
      <button className="btn" onClick={startListening}>{listening?"🎙️ Listening…":"🎙️ Talk to Room"}</button>
      <button className="btn" onClick={interrupt}>Interrupt</button>
    </div>
    {reply&&<div style={{marginTop:10}}><b>{responder||"NERVS"}</b><p style={{margin:"4px 0 0"}}>{reply}</p></div>}
  </div>;
}