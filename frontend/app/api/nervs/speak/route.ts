import {NextResponse} from "next/server";
import {requireFounder} from "../../../../lib/auth";

export const runtime="nodejs";

const VOICES={
  simon:null,
  marie:"DODLEQrClDo8wCz460ld",
  eyes:"jRAAK67SEFE9m7ci5DhD",
  mark:"IKne3meq5aSn9XLyUdCD",
  cammy:"XrExE9yKIg1WjnnlVkGX",
  eve:"yj30vwTGJxSHezdAGsv9",
  tube:"TX3LPaxmHKxFdv7VOQHJ",
  lucy:"XlDdozLmuTofIxK4BjPD",
  snake:"jHprmvvyQreWpRuutdmV",
  alice:"Xb7hH8MSUJpSbSDYk0k2",
  echo:"cjVigY5qzO86Huf0OWal",
  booker:"Cz0K1kOv9tD8l0b5Qu53",
} as const;

const VOICE_NAMES={
  simon:"Sir Michael Caine™",
  snake:"Snake canonical ElevenLabs voice",
} as const;

function normalizeVoiceName(value:string){
  return value.toLowerCase().replace(/[™®©]/g,"").replace(/\s+/g," ").trim();
}

async function findVoiceByName(apiKey:string,name:string){
  const url=new URL("https://api.elevenlabs.io/v2/voices");
  url.searchParams.set("search",name);
  url.searchParams.set("page_size","100");
  const r=await fetch(url,{
    headers:{"xi-api-key":apiKey,"Accept":"application/json"},
    cache:"no-store",
  });
  if(!r.ok) return null;
  const data=await r.json().catch(()=>({}));
  const voices=Array.isArray(data?.voices)?data.voices:[];
  const target=normalizeVoiceName(name);
  const exact=voices.find((v:any)=>normalizeVoiceName(String(v?.name||""))===target);
  const close=voices.find((v:any)=>normalizeVoiceName(String(v?.name||"")).includes(target)||target.includes(normalizeVoiceName(String(v?.name||""))));
  const match=exact||close;
  return match?.voice_id?String(match.voice_id):null;
}

async function resolveVoiceId(agentId:keyof typeof VOICES,apiKey:string){
  if(agentId==="simon"){
    const envId=String(process.env.SIMON_ELEVENLABS_VOICE_ID||"").trim();
    if(envId) return {voiceId:envId,voiceName:VOICE_NAMES.simon,source:"env"};
    const voiceName=String(process.env.SIMON_ELEVENLABS_VOICE_NAME||VOICE_NAMES.simon).trim();
    const found=await findVoiceByName(apiKey,voiceName);
    if(found) return {voiceId:found,voiceName,source:"account_lookup"};
    return {voiceId:null,voiceName,source:"not_found"};
  }

  if(agentId==="snake"){
    const envId=String(process.env.SNAKE_ELEVENLABS_VOICE_ID||"").trim();
    if(envId) return {voiceId:envId,voiceName:VOICE_NAMES.snake,source:"env"};
    const voiceName=String(process.env.SNAKE_ELEVENLABS_VOICE_NAME||VOICE_NAMES.snake).trim();
    const found=await findVoiceByName(apiKey,voiceName);
    if(found) return {voiceId:found,voiceName,source:"account_lookup"};
  }

  return {voiceId:VOICES[agentId],voiceName:null,source:"registry"};
}

export async function POST(req:Request){
  const founder=await requireFounder();
  if(!founder) return NextResponse.json({error:"Founder access required"},{status:403});

  const apiKey=process.env.ELEVENLABS_API_KEY;
  if(!apiKey) return NextResponse.json({error:"NERVS voice provider is not configured"},{status:503});

  const body=await req.json().catch(()=>({}));
  const agentId=String(body.agent_id||"").toLowerCase() as keyof typeof VOICES;
  const text=String(body.text||"").trim();

  if(!(agentId in VOICES)) return NextResponse.json({error:"Unknown NERVS agent"},{status:400});
  if(!text) return NextResponse.json({error:"Text required"},{status:400});
  if(text.length>1200) return NextResponse.json({error:"Text must be 1200 characters or fewer"},{status:400});

  const resolved=await resolveVoiceId(agentId,apiKey);
  if(!resolved.voiceId){
    return NextResponse.json({
      error:"VOICE_NOT_FOUND",
      agent_id:agentId,
      requested_voice:resolved.voiceName,
      detail:agentId==="simon"
        ? "Simon is locked to Sir Michael Caine™. Add that voice to the connected ElevenLabs account or set SIMON_ELEVENLABS_VOICE_ID."
        : "The requested ElevenLabs voice is not available.",
    },{status:503});
  }

  const r=await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(resolved.voiceId)}`,{
    method:"POST",
    headers:{
      "xi-api-key":apiKey,
      "Content-Type":"application/json",
      "Accept":"audio/mpeg",
    },
    body:JSON.stringify({
      text,
      model_id:"eleven_multilingual_v2",
      voice_settings:{stability:.58,similarity_boost:.82,style:.18,use_speaker_boost:true},
    }),
  });

  if(!r.ok){
    const detail=await r.text().catch(()=>"");
    return NextResponse.json({
      error:"NERVS_VOICE_PROVIDER_REJECTED",
      agent_id:agentId,
      requested_voice:resolved.voiceName,
      voice_id:resolved.voiceId,
      provider_status:r.status,
      detail:detail.slice(0,600),
    },{status:502});
  }

  const audio=Buffer.from(await r.arrayBuffer()).toString("base64");
  return NextResponse.json({
    status:"AUDIO_READY",
    agent_id:agentId,
    voice_name:resolved.voiceName,
    voice_id:resolved.voiceId,
    voice_source:resolved.source,
    content_type:"audio/mpeg",
    audio_base64:audio,
  });
}
