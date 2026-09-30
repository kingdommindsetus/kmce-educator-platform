import {NextResponse} from "next/server";
import {requireFounder} from "../../../../lib/auth";

export const runtime="nodejs";
export const maxDuration=30;

const PRIMARY_MS=9000;
const FALLBACK_MS=7000;

const OPENAI_VOICES={
  simon:"cedar",
  marie:"marin",
  eyes:"nova",
  mark:"onyx",
  cammy:"sage",
  eve:"cedar",
  tube:"verse",
  lucy:"shimmer",
  snake:"fable",
  alice:"coral",
  echo:"echo",
  booker:"ash",
} as const;

type AgentId=keyof typeof OPENAI_VOICES;

const OPENAI_STYLE:Record<AgentId,string>={
  simon:"Speak like a polished executive orchestrator: calm, authoritative, measured, and clear.",
  marie:"Speak warmly, professionally, and reassuringly like an executive operations lead.",
  eyes:"Speak with strong projection, crisp confidence, and noticeable energy like a sharp market-intelligence lead briefing executives. Never sound soft or subdued.",
  mark:"Speak with strong confidence, upbeat executive energy, and clear projection like a strategic marketing director presenting a decisive recommendation.",
  cammy:"Speak upbeat, professional, energetic, and numbers-aware like a campaign director.",
  eve:"Speak in a clearly male, polished, refined, confident brand-director voice with clear projection. Sound authoritative, modern, and easy to hear.",
  tube:"Speak energetic, creator-friendly, engaging, and confident without sounding exaggerated.",
  lucy:"Speak bright, energetic, social, and audience-aware with clear projection.",
  snake:"Speak analytical, controlled, precise, and confident like a growth-measurement lead.",
  alice:"Speak in a clearly female, warm, polished, and confident voice like a storefront and website quality lead. Sound professional, decisive, and easy to hear.",
  echo:"Speak smoothly, confidently, and persuasively like a trusted sales-outreach professional.",
  booker:"Speak in a clearly male, warm, polished scheduling-coordinator voice. Sound friendly, organized, upbeat, professional, and easy to hear.",
};

const SPEED:Record<AgentId,number>={
  simon:1,
  marie:1,
  eyes:1.08,
  mark:1.05,
  cammy:1.05,
  eve:1,
  tube:1.06,
  lucy:1.06,
  snake:1,
  alice:1,
  echo:1.03,
  booker:1.02,
};

const ELEVENLABS_VOICES:Record<AgentId,string|null>={
  simon:null,
  marie:"EXAVITQu4vr4xnSDxMaL",
  eyes:"CwhRBWXzGAHq8TQ4Fs17",
  mark:"IKne3meq5aSn9XLyUdCD",
  cammy:"XrExE9yKIg1WjnnlVkGX",
  eve:"VR6AewLTigWG4xSOukaG",
  tube:"TX3LPaxmHKxFdv7VOQHJ",
  lucy:"cgSgspJ2msm6clMCkdW9",
  snake:"k5eu7V3cPJkEA7D2irmP",
  alice:"Xb7hH8MSUJpSbSDYk0k2",
  echo:"cjVigY5qzO86Huf0OWal",
  booker:"Cz0K1kOv9tD8l0b5Qu53",
};

type Attempt={
  provider:"openai"|"elevenlabs";
  ok:boolean;
  errorClass?:string;
  status?:number;
};

function classify(error:unknown){
  const name=error instanceof Error?error.name:"";
  return name==="TimeoutError"||name==="AbortError"?"timeout":"network_error";
}

function log(event:string,data:Record<string,unknown>){
  console.log(JSON.stringify({event,...data}));
}

async function openaiTTS(
  apiKey:string,
  agentId:AgentId,
  text:string,
):Promise<{audio?:ArrayBuffer;attempt:Attempt}>{
  try{
    const r=await fetch("https://api.openai.com/v1/audio/speech",{
      method:"POST",
      headers:{
        Authorization:`Bearer ${apiKey}`,
        "Content-Type":"application/json",
        Accept:"audio/mpeg",
      },
      body:JSON.stringify({
        model:"gpt-4o-mini-tts",
        input:text,
        voice:OPENAI_VOICES[agentId],
        instructions:OPENAI_STYLE[agentId],
        speed:SPEED[agentId],
        response_format:"mp3",
      }),
      signal:AbortSignal.timeout(PRIMARY_MS),
    });

    if(!r.ok){
      return {
        attempt:{
          provider:"openai",
          ok:false,
          errorClass:"provider_rejected",
          status:r.status,
        },
      };
    }

    return {
      audio:await r.arrayBuffer(),
      attempt:{provider:"openai",ok:true},
    };
  }catch(error){
    return {
      attempt:{
        provider:"openai",
        ok:false,
        errorClass:classify(error),
      },
    };
  }
}

async function elevenLabsTTS(
  apiKey:string,
  voiceId:string,
  text:string,
):Promise<{audio?:ArrayBuffer;attempt:Attempt}>{
  try{
    const r=await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
      {
        method:"POST",
        headers:{
          "xi-api-key":apiKey,
          "Content-Type":"application/json",
          Accept:"audio/mpeg",
        },
        body:JSON.stringify({
          text,
          model_id:"eleven_multilingual_v2",
          voice_settings:{
            stability:.58,
            similarity_boost:.82,
            style:.18,
            use_speaker_boost:true,
          },
        }),
        signal:AbortSignal.timeout(FALLBACK_MS),
      },
    );

    if(!r.ok){
      return {
        attempt:{
          provider:"elevenlabs",
          ok:false,
          errorClass:"provider_rejected",
          status:r.status,
        },
      };
    }

    return {
      audio:await r.arrayBuffer(),
      attempt:{provider:"elevenlabs",ok:true},
    };
  }catch(error){
    return {
      attempt:{
        provider:"elevenlabs",
        ok:false,
        errorClass:classify(error),
      },
    };
  }
}

function elevenLabsVoice(agentId:AgentId){
  if(agentId==="simon"){
    const envId=String(process.env.SIMON_ELEVENLABS_VOICE_ID||"").trim();
    return envId||null;
  }
  return ELEVENLABS_VOICES[agentId];
}

export async function POST(req:Request){
  const started=Date.now();
  const founder=await requireFounder();
  if(!founder){
    return NextResponse.json({error:"Founder access required"},{status:403});
  }

  const body=await req.json().catch(()=>({}));
  const agentId=String(body.agent_id||"").toLowerCase() as AgentId;
  const text=String(body.text||"").trim();
  const meetingId=body.meeting_id??null;
  const turnId=body.turn_id??null;
  const responseMode=body.response_mode==="binary"?"binary":"json";

  if(!(agentId in OPENAI_VOICES)){
    return NextResponse.json({error:"Unknown PEGASUS agent"},{status:400});
  }
  if(!text){
    return NextResponse.json({error:"Text required"},{status:400});
  }
  if(text.length>1200){
    return NextResponse.json(
      {error:"Text must be 1200 characters or fewer"},
      {status:400},
    );
  }

  const attempts:Attempt[]=[];
  let audio:ArrayBuffer|undefined;
  let provider:"openai"|"elevenlabs"|null=null;
  let voiceName:string|null=null;
  let voiceId:string|null=null;
  let voiceSource="";

  const openaiKey=process.env.OPENAI_API_KEY;
  if(openaiKey){
    const primary=await openaiTTS(openaiKey,agentId,text);
    attempts.push(primary.attempt);
    if(primary.audio){
      audio=primary.audio;
      provider="openai";
      voiceName=OPENAI_VOICES[agentId];
      voiceId=OPENAI_VOICES[agentId];
      voiceSource="openai_locked";
    }
  }else{
    attempts.push({
      provider:"openai",
      ok:false,
      errorClass:"not_configured",
    });
  }

  if(!audio){
    const elevenKey=process.env.ELEVENLABS_API_KEY;
    const fallbackVoice=elevenLabsVoice(agentId);

    if(elevenKey&&fallbackVoice){
      const fallback=await elevenLabsTTS(elevenKey,fallbackVoice,text);
      attempts.push(fallback.attempt);
      if(fallback.audio){
        audio=fallback.audio;
        provider="elevenlabs";
        voiceName=null;
        voiceId=fallbackVoice;
        voiceSource="fallback_elevenlabs";
      }
    }else{
      attempts.push({
        provider:"elevenlabs",
        ok:false,
        errorClass:elevenKey?"voice_not_configured":"not_configured",
      });
    }
  }

  const ms=Date.now()-started;

  if(!audio||!provider){
    log("pegasus_speak_failed",{
      meetingId,
      turnId,
      agentId,
      ms,
      attempts,
    });

    return NextResponse.json({
      error:"PEGASUS_VOICE_UNAVAILABLE",
      failed:true,
      skip_turn:true,
      agent_id:agentId,
      turn_id:turnId,
      attempts:attempts.map(({provider,errorClass,status})=>({
        provider,
        errorClass,
        status,
      })),
    },{status:502});
  }

  log("pegasus_speak_ok",{
    meetingId,
    turnId,
    agentId,
    provider,
    fallback:provider!=="openai",
    ms,
    attempts:attempts.length,
  });

  if(responseMode==="binary"){
    return new NextResponse(audio,{
      headers:{
        "Content-Type":"audio/mpeg",
        "Cache-Control":"no-store",
        "X-PEGASUS-Provider":provider,
        "X-PEGASUS-Voice-Source":voiceSource,
      },
    });
  }

  return NextResponse.json({
    status:"AUDIO_READY",
    agent_id:agentId,
    turn_id:turnId,
    provider,
    fallback:provider!=="openai",
    voice_name:voiceName,
    voice_id:voiceId,
    voice_source:voiceSource,
    content_type:"audio/mpeg",
    audio_base64:Buffer.from(audio).toString("base64"),
  });
}
