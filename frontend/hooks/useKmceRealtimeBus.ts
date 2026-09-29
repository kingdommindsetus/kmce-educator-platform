"use client";

import {useEffect,useRef,useState} from "react";

type BusStatus=
  | "IDLE"
  | "STARTING"
  | "LISTENING"
  | "RECORDING"
  | "TRANSCRIBING"
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
  const enabledRef=useRef(enabled);
  const disabledRef=useRef(disabled);
  const handlingRef=useRef(false);
  const streamRef=useRef<MediaStream|null>(null);
  const recorderRef=useRef<MediaRecorder|null>(null);
  const audioContextRef=useRef<AudioContext|null>(null);
  const frameRef=useRef<number|null>(null);
  const chunksRef=useRef<BlobPart[]>([]);
  const speechStartedAtRef=useRef(0);
  const lastVoiceAtRef=useRef(0);
  const noiseFloorRef=useRef(.008);
  const startedAtRef=useRef(0);

  enabledRef.current=enabled;
  disabledRef.current=disabled;

  function cleanup(){
    if(frameRef.current!==null){
      cancelAnimationFrame(frameRef.current);
      frameRef.current=null;
    }
    try{recorderRef.current?.stop();}catch{}
    recorderRef.current=null;
    streamRef.current?.getTracks().forEach(t=>t.stop());
    streamRef.current=null;
    void audioContextRef.current?.close().catch(()=>{});
    audioContextRef.current=null;
    chunksRef.current=[];
  }

  async function transcribe(blob:Blob){
    if(blob.size<900||handlingRef.current||disabledRef.current) return;
    handlingRef.current=true;
    setStatus("TRANSCRIBING");
    setInterim("Understanding…");

    try{
      const type=blob.type||"audio/webm";
      const ext=type.includes("mp4")?"m4a":type.includes("ogg")?"ogg":"webm";
      const form=new FormData();
      form.set("audio",new File([blob],`kmce-live.${ext}`,{type}));

      const r=await fetch("/api/nervs/transcribe",{method:"POST",body:form});
      const data=await r.json().catch(()=>({}));
      if(!r.ok) throw new Error(String(data?.detail||data?.error||"Transcription failed"));

      const text=String(data?.text||"").trim();
      setInterim(text);
      if(text){
        setStatus("THINKING");
        await onFinalTranscript(text);
      }
      setInterim("");
      if(enabledRef.current&&!disabledRef.current) setStatus("LISTENING");
    }catch{
      setInterim("");
      setStatus("ERROR");
    }finally{
      handlingRef.current=false;
    }
  }

  function stop(){
    enabledRef.current=false;
    cleanup();
    setInterim("");
    setStatus("IDLE");
  }

  useEffect(()=>{
    enabledRef.current=enabled;
    if(!enabled){
      cleanup();
      setInterim("");
      setStatus("IDLE");
      return;
    }

    let cancelled=false;

    async function start(){
      setStatus("STARTING");
      try{
        const stream=await navigator.mediaDevices.getUserMedia({
          audio:{
            echoCancellation:true,
            noiseSuppression:true,
            autoGainControl:true,
            channelCount:1,
          },
        });
        if(cancelled){
          stream.getTracks().forEach(t=>t.stop());
          return;
        }

        streamRef.current=stream;
        const AudioContextCtor=window.AudioContext||(window as any).webkitAudioContext;
        const context=new AudioContextCtor();
        audioContextRef.current=context;
        const source=context.createMediaStreamSource(stream);
        const analyser=context.createAnalyser();
        analyser.fftSize=1024;
        analyser.smoothingTimeConstant=.2;
        source.connect(analyser);

        const samples=new Uint8Array(analyser.fftSize);
        startedAtRef.current=performance.now();
        setStatus("LISTENING");

        const tick=()=>{
          if(cancelled||!enabledRef.current) return;

          analyser.getByteTimeDomainData(samples);
          let sum=0;
          for(let i=0;i<samples.length;i++){
            const v=(samples[i]-128)/128;
            sum+=v*v;
          }
          const rms=Math.sqrt(sum/samples.length);
          const now=performance.now();

          if(!recorderRef.current&&now-startedAtRef.current<700){
            noiseFloorRef.current=noiseFloorRef.current*.85+rms*.15;
          }

          const threshold=Math.max(.022,noiseFloorRef.current*2.8);
          const activeVoice=rms>threshold;

          if(!disabledRef.current&&!handlingRef.current&&!recorderRef.current&&activeVoice){
            onBargeIn?.();
            const mimeCandidates=["audio/webm;codecs=opus","audio/webm","audio/mp4"];
            const mime=mimeCandidates.find(x=>MediaRecorder.isTypeSupported(x));
            const recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);
            recorderRef.current=recorder;
            chunksRef.current=[];
            speechStartedAtRef.current=now;
            lastVoiceAtRef.current=now;
            recorder.ondataavailable=e=>{if(e.data.size) chunksRef.current.push(e.data);};
            recorder.onstop=()=>{
              const parts=chunksRef.current.slice();
              chunksRef.current=[];
              recorderRef.current=null;
              if(parts.length) void transcribe(new Blob(parts,{type:recorder.mimeType||"audio/webm"}));
            };
            recorder.start(200);
            setStatus("RECORDING");
            setInterim("Hearing you…");
          }

          if(recorderRef.current){
            if(activeVoice) lastVoiceAtRef.current=now;
            const recordedFor=now-speechStartedAtRef.current;
            const silentFor=now-lastVoiceAtRef.current;
            if((recordedFor>650&&silentFor>950)||recordedFor>20000){
              try{recorderRef.current.stop();}catch{}
              setInterim("");
            }
          }else if(!activeVoice&&now-startedAtRef.current>700){
            noiseFloorRef.current=Math.min(.05,noiseFloorRef.current*.995+rms*.005);
          }

          frameRef.current=requestAnimationFrame(tick);
        };

        frameRef.current=requestAnimationFrame(tick);
      }catch{
        setStatus("ERROR");
      }
    }

    void start();

    return ()=>{
      cancelled=true;
      cleanup();
    };
  },[enabled]);

  useEffect(()=>{
    disabledRef.current=disabled;
    if(!enabled) return;
    if(disabled){
      setStatus("PAUSED");
      return;
    }
    if(status==="PAUSED") setStatus("LISTENING");
  },[disabled,enabled]);

  return {status,interim,stop};
}
