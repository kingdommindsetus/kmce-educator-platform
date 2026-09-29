"use client";

import {useEffect,useRef,useState} from "react";
import {NERVS_AVATAR_PACK_V1} from "../lib/nervs-avatar-registry";
import {useKmceRealtimeBus} from "../hooks/useKmceRealtimeBus";

type Msg={id?:number;role:"FOUNDER"|"AGENT"|"SYSTEM";content:string;created_at?:string};
type Props={agentName:string;role?:string};

export default function AgentConversation({agentName,role}:Props){
  const agent=NERVS_AVATAR_PACK_V1.find(a=>a.name.toLowerCase()===agentName.toLowerCase());
  const [messages,setMessages]=useState<Msg[]>([]);
  const [sessionId,setSessionId]=useState<number|null>(null);
  const [input,setInput]=useState("");
  const [status,setStatus]=useState("READY");
  const [listening,setListening]=useState(false);
  const [liveMode,setLiveMode]=useState(false);
  const audioRef=useRef<HTMLAudioElement|null>(null);
  const recognitionRef=useRef<any>(null);
  const thinkingRef=useRef(false);

  const isRealtimePilot=agent?.id==="simon";

  const realtime=useKmceRealtimeBus({
    enabled:Boolean(isRealtimePilot&&liveMode),
    disabled:false,
    onBargeIn:()=>{
      stopSpeaking();
    },
    onFinalTranscript:async(text)=>{
      if(thinkingRef.current) return;
      await send(text,"voice");
    },
  });

  useEffect(()=>{
    if(!agent) return;
    void load();
    return ()=>{
      recognitionRef.current?.stop?.();
      audioRef.current?.pause();
    };
  },[agent?.id]);

  async function load(){
    if(!agent) return;
    const r=await fetch("/api/agents/"+agent.id+"/conversation",{cache:"no-store"});
    const data=await r.json().catch(()=>({}));
    if(!r.ok){setStatus(data?.error||"LOAD ERROR");return;}
    setSessionId(data.session?.id?Number(data.session.id):null);
    setMessages((data.messages||[]) as Msg[]);
  }

  function stopSpeaking(){
    if(audioRef.current){
      audioRef.current.pause();
      audioRef.current.currentTime=0;
      audioRef.current=null;
    }
    if(!thinkingRef.current) setStatus(liveMode?"LISTENING":"READY");
  }

  async function speak(text:string){
    if(!agent) return;
    const r=await fetch("/api/nervs/speak",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({agent_id:agent.id,text:text.slice(0,1200)}),
    });
    const data=await r.json().catch(()=>({}));
    if(!r.ok){
      setStatus("VOICE UNAVAILABLE · "+String(data?.requested_voice||data?.detail||data?.error||"UNKNOWN").slice(0,90));
      return;
    }
    const audio=new Audio("data:"+(data.content_type||"audio/mpeg")+";base64,"+data.audio_base64);
    audioRef.current=audio;
    audio.onplay=()=>setStatus("SPEAKING");
    audio.onended=()=>{audioRef.current=null;setStatus(liveMode?"LISTENING":"READY");};
    audio.onerror=()=>{audioRef.current=null;setStatus("VOICE ERROR");};
    await audio.play().catch(()=>setStatus("PLAYBACK BLOCKED"));
  }

  async function send(textOverride?:string,inputMode:"text"|"voice"="text"){
    if(!agent) return;
    const text=(textOverride??input).trim();
    if(!text||thinkingRef.current) return;
    thinkingRef.current=true;
    stopSpeaking();
    setInput("");
    setStatus("THINKING");
    setMessages(prev=>[...prev,{role:"FOUNDER",content:text}]);

    try{
      const r=await fetch("/api/agents/"+agent.id+"/conversation",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({message:text,session_id:sessionId,input_mode:inputMode}),
      });
      const data=await r.json().catch(()=>({}));
      if(!r.ok){
        setStatus(data?.error==="LLM_NOT_CONFIGURED"?"LLM NOT CONFIGURED":data?.error||"REPLY ERROR");
        return;
      }

      setSessionId(Number(data.session_id));
      const reply=String(data.message?.content||"").trim();
      if(reply){
        setMessages(prev=>[...prev,{role:"AGENT",content:reply,created_at:data.message?.created_at}]);
        setStatus("VOICE GENERATING");
        thinkingRef.current=false;
        await speak(reply);
      }else{
        setStatus(liveMode?"LISTENING":"READY");
      }
    }finally{
      thinkingRef.current=false;
    }
  }

  function startListening(){
    if(!agent) return;
    stopSpeaking();
    const w=window as any;
    const SR=w.SpeechRecognition||w.webkitSpeechRecognition;
    if(!SR){setStatus("MIC TRANSCRIPTION NOT SUPPORTED IN THIS BROWSER");return;}
    recognitionRef.current?.stop?.();
    const rec=new SR();
    recognitionRef.current=rec;
    rec.lang="en-US";
    rec.interimResults=true;
    rec.continuous=false;
    let finalText="";
    rec.onstart=()=>{setListening(true);setStatus("LISTENING");};
    rec.onresult=(event:any)=>{
      let interim="";
      for(let i=event.resultIndex;i<event.results.length;i++){
        const t=String(event.results[i][0]?.transcript||"");
        if(event.results[i].isFinal) finalText+=t; else interim+=t;
      }
      setInput((finalText||interim).trim());
    };
    rec.onerror=()=>{setListening(false);setStatus("MIC ERROR");};
    rec.onend=()=>{
      setListening(false);
      const text=finalText.trim();
      if(text) void send(text,"voice");
      else setStatus("READY");
    };
    rec.start();
  }

  if(!agent) return <div className="tomorrow"><div className="eyebrow">LIVE CONVERSATION</div><p className="muted">Realtime office conversation is not configured for {agentName} yet.</p></div>;

  const displayStatus=liveMode&&isRealtimePilot&&status==="READY"?"LIVE · "+realtime.status:liveMode&&isRealtimePilot&&status==="LISTENING"?"LIVE · "+realtime.status:status;

  return <div className="tomorrow" style={{margin:"18px 0"}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}>
      <div>
        <div className="eyebrow">{liveMode&&isRealtimePilot?"KMCE REALTIME BUS V1":"LIVE OFFICE CONVERSATION"}</div>
        <b>Talk to {agent.name}</b>
        <div className="muted" style={{fontSize:12}}>{role||agent.role} · persistent Neon memory{agent.voiceName?" · "+agent.voiceName:""}</div>
      </div>
      <span className="pill">{displayStatus}</span>
    </div>

    <div style={{marginTop:12,maxHeight:300,overflowY:"auto",border:"1px solid var(--line)",padding:10}}>
      {!messages.length&&<p className="muted">No conversation yet. Say something to {agent.name}.</p>}
      {messages.slice(-20).map((m,i)=><div key={(m.id||i)+"-"+m.role} className="activity-row">
        <b>{m.role==="AGENT"?agent.name:"Kimberly"}</b>
        <span>{m.content}</span>
      </div>)}
      {liveMode&&realtime.interim&&<div className="activity-row"><b>Kimberly</b><span className="muted">{realtime.interim}…</span></div>}
    </div>

    <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
      <input
        value={input}
        onChange={e=>setInput(e.target.value)}
        onKeyDown={e=>{if(e.key==="Enter") void send();}}
        placeholder={"Talk to "+agent.name+"…"}
        style={{flex:"1 1 360px",padding:"12px 14px",background:"#090909",color:"white",border:"1px solid var(--line)"}}
      />
      <button type="button" className="btn primary" onClick={()=>void send()}>Send</button>
      {isRealtimePilot&&<button
        type="button"
        className={liveMode?"btn primary":"btn"}
        onClick={()=>{stopSpeaking();setLiveMode(v=>!v);setStatus("READY");}}
      >{liveMode?"● End Live":"◉ Start Live"}</button>}
      {!liveMode&&<button type="button" className="btn" onClick={startListening}>{listening?"🎙️ Listening…":"🎙️ Talk"}</button>}
      <button type="button" className="btn" onClick={stopSpeaking}>Interrupt</button>
    </div>

    <div className="muted" style={{fontSize:12,marginTop:8}}>
      {liveMode&&isRealtimePilot
        ?"Hands-free pilot: your speech interrupts Simon immediately; each completed turn is stored through the existing Neon conversation and memory pipeline."
        :"Your voice turn interrupts current playback. Conversation is informational; external actions still follow KMCE authority gates."}
    </div>
  </div>;
}
