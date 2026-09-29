"use client";

import {useEffect,useRef,useState} from "react";

type BusStatus =
  | "IDLE"
  | "STARTING"
  | "LISTENING"
  | "THINKING"
  | "SPEAKING"
  | "PAUSED"
  | "ERROR";

type Options={
  enabled:boolean;
  onFinalTranscript:(text:string)=>Promise<void>|void;
  onBargeIn?:()=>void;
  disabled?:boolean;
};

export function useKmceRealtimeBus({enabled,onFinalTranscript,onBargeIn,disabled}:Options){
  const [status,setStatus]=useState<BusStatus>("IDLE");
  const [interim,setInterim]=useState("");
  const recognitionRef=useRef<any>(null);
  const enabledRef=useRef(enabled);
  const disabledRef=useRef(disabled);
  const handlingFinalRef=useRef(false);
  const restartTimerRef=useRef<number|null>(null);

  enabledRef.current=enabled;
  disabledRef.current=disabled;

  function clearRestart(){
    if(restartTimerRef.current!==null){
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current=null;
    }
  }

  function scheduleRestart(){
    clearRestart();
    if(!enabledRef.current||disabledRef.current) return;
    restartTimerRef.current=window.setTimeout(()=>{
      if(!enabledRef.current||disabledRef.current) return;
      try{ recognitionRef.current?.start?.(); }catch{}
    },180);
  }

  function stop(){
    clearRestart();
    enabledRef.current=false;
    try{recognitionRef.current?.stop?.();}catch{}
    recognitionRef.current=null;
    setInterim("");
    setStatus("IDLE");
  }

  useEffect(()=>{
    enabledRef.current=enabled;
    if(!enabled){
      try{recognitionRef.current?.stop?.();}catch{}
      recognitionRef.current=null;
      setInterim("");
      setStatus("IDLE");
      return;
    }

    const w=window as any;
    const SR=w.SpeechRecognition||w.webkitSpeechRecognition;
    if(!SR){
      setStatus("ERROR");
      return;
    }

    const rec=new SR();
    recognitionRef.current=rec;
    rec.lang="en-US";
    rec.interimResults=true;
    rec.continuous=true;
    rec.maxAlternatives=1;

    rec.onstart=()=>{
      if(!disabledRef.current) setStatus("LISTENING");
    };

    rec.onspeechstart=()=>{
      onBargeIn?.();
      if(!disabledRef.current) setStatus("LISTENING");
    };

    rec.onresult=(event:any)=>{
      let interimText="";
      const finals:string[]=[];
      for(let i=event.resultIndex;i<event.results.length;i++){
        const text=String(event.results[i][0]?.transcript||"").trim();
        if(!text) continue;
        if(event.results[i].isFinal) finals.push(text);
        else interimText+=(interimText?" ":"")+text;
      }
      setInterim(interimText);
      if(finals.length&&!handlingFinalRef.current&&!disabledRef.current){
        const finalText=finals.join(" ").trim();
        if(finalText){
          handlingFinalRef.current=true;
          setInterim("");
          setStatus("THINKING");
          Promise.resolve(onFinalTranscript(finalText))
            .catch(()=>setStatus("ERROR"))
            .finally(()=>{
              handlingFinalRef.current=false;
              if(enabledRef.current&&!disabledRef.current) setStatus("LISTENING");
            });
        }
      }
    };

    rec.onerror=(event:any)=>{
      const code=String(event?.error||"");
      if(code==="aborted"||code==="no-speech") return;
      if(code==="not-allowed"||code==="service-not-allowed"){
        setStatus("ERROR");
        enabledRef.current=false;
        return;
      }
      scheduleRestart();
    };

    rec.onend=()=>{
      if(enabledRef.current&&!disabledRef.current) scheduleRestart();
    };

    setStatus("STARTING");
    try{rec.start();}catch{scheduleRestart();}

    return ()=>{
      clearRestart();
      try{rec.stop();}catch{}
      recognitionRef.current=null;
    };
  },[enabled]);

  useEffect(()=>{
    disabledRef.current=disabled;
    if(!enabled) return;
    if(disabled){
      setStatus("PAUSED");
      return;
    }
    if(status==="PAUSED"){
      setStatus("LISTENING");
      scheduleRestart();
    }
  },[disabled,enabled]);

  return {status,interim,stop};
}
