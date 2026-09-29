import {NextResponse} from "next/server";
import {requireFounder} from "../../../../lib/auth";

export const runtime="nodejs";

const VOICES={
  simon:"pNInz6obpgDQGcFmaJgB",
  marie:"21m00Tcm4TlvDq8ikWAM",
  eyes:"EXAVITQu4vr4xnSDxMaL",
  mark:"IKne3meq5aSn9XLyUdCD",
  cammy:"XrExE9yKIg1WjnnlVkGX",
  eve:"AZnzlk1XvdvUeBnXmlld",
  tube:"TX3LPaxmHKxFdv7VOQHJ",
  lucy:"MF3mGyEYCl7XYWbV9V6O",
  snake:"TxGEqnHWrfWFTfGW9XjX",
  alice:"Xb7hH8MSUJpSbSDYk0k2",
  echo:"cjVigY5qzO86Huf0OWal",
  booker:"yoZ06aMxZJJ28mfd3POQ",
} as const;


const OPENAI_VOICES={
  simon:"cedar",
  marie:"marin",
  eyes:"nova",
  mark:"onyx",
  cammy:"coral",
  eve:"shimmer",
  tube:"verse",
  lucy:"nova",
  snake:"ash",
  alice:"marin",
  echo:"cedar",
  booker:"sage",
} as const;

const FORCE_OPENAI=new Set<keyof typeof VOICES>(["eyes","alice","echo","booker"]);

const OPENAI_STYLE={
  simon:"Speak in a calm, polished British executive tone with measured pacing.",
  marie:"Speak warmly, professionally, and reassuringly like an executive operations lead.",
  eyes:"Speak with strong projection, crisp confidence, and noticeable energy. Sound like a sharp market-intelligence lead presenting an important finding to executives. Keep the delivery lively, assertive, and easy to hear. Do not sound soft, sleepy, or subdued.",
  mark:"Speak confidently and directly like a strategic marketing director.",
  cammy:"Speak upbeat, professional, and numbers-aware.",
  eve:"Speak polished, refined, and brand-conscious.",
  tube:"Speak energetic and creator-friendly without sounding exaggerated.",
  lucy:"Speak bright, social, and audience-aware.",
  snake:"Speak dry, controlled, and analytical.",
  alice:"Speak clearly and professionally like an educator.",
  echo:"Speak smoothly and confidently like a trusted sales professional.",
  booker:"Speak warmly, clearly, and efficiently like a scheduling coordinator.",
} as const;

const AGENT_ORDER=[
  "marie","eyes","mark","cammy","eve","tube","lucy","snake","alice","echo","booker",
] as const;

type AvailableVoice={voice_id:string;name?:string};

async function getAvailableVoices(apiKey:string):Promise<AvailableVoice[]>{
  const url=new URL("https://api.elevenlabs.io/v2/voices");
  url.searchParams.set("page_size","100");
  const r=await fetch(url,{
    headers:{"xi-api-key":apiKey,"Accept":"application/json"},
    cache:"no-store",
  });
  if(!r.ok) return [];
  const data=await r.json().catch(()=>({}));
  const voices=Array.isArray(data?.voices)?data.voices:[];
  return voices
    .filter((v:any)=>typeof v?.voice_id==="string" && v.voice_id)
    .map((v:any)=>({voice_id:String(v.voice_id),name:String(v?.name||"")}));
}

async function resolveVoiceId(agentId:keyof typeof VOICES,apiKey:string){
  if(agentId==="simon"){
    return {
      voiceId:"3WqHLnw80rOZqJzW9YRB",
      voiceName:"Daniel - Radio news host",
      source:"locked_simon_original",
      alternatives:[] as AvailableVoice[],
    };
  }

  if(agentId==="marie"){
    return {
      voiceId:"EXAVITQu4vr4xnSDxMaL",
      voiceName:"Sarah - Mature, Reassuring, Confident",
      source:"locked_marie_verified",
      alternatives:[] as AvailableVoice[],
    };
  }

  const available=await getAvailableVoices(apiKey);
  const nonSimon=available.filter(v=>v.voice_id!=="pNInz6obpgDQGcFmaJgB");
  const index=AGENT_ORDER.indexOf(agentId as typeof AGENT_ORDER[number]);
  const selected=nonSimon.length
    ? nonSimon[(index>=0?index:0)%nonSimon.length]
    : null;

  return {
    voiceId:selected?.voice_id||VOICES[agentId],
    voiceName:selected?.name||agentId,
    source:selected?"account_voice":"registry_fallback",
    alternatives:nonSimon,
  };
}

export async function POST(req:Request){
  const founder=await requireFounder();
  if(!founder) return NextResponse.json({error:"Founder access required"},{status:403});

  const apiKey=process.env.ELEVENLABS_API_KEY;
  const openaiKey=process.env.OPENAI_API_KEY;
  if(!apiKey && !openaiKey) return NextResponse.json({error:"NERVS voice providers are not configured"},{status:503});

  const body=await req.json().catch(()=>({}));
  const agentId=String(body.agent_id||"").toLowerCase() as keyof typeof VOICES;
  const text=String(body.text||"").trim();

  if(!(agentId in VOICES)) return NextResponse.json({error:"Unknown NERVS agent"},{status:400});
  if(!text) return NextResponse.json({error:"Text required"},{status:400});
  if(text.length>1200) return NextResponse.json({error:"Text must be 1200 characters or fewer"},{status:400});

  const resolved=apiKey
    ? await resolveVoiceId(agentId,apiKey)
    : {voiceId:"",voiceName:agentId,source:"elevenlabs_unavailable",alternatives:[] as AvailableVoice[]};


  if(!resolved.voiceId && !openaiKey){
    return NextResponse.json({
      error:"VOICE_NOT_FOUND",
      agent_id:agentId,
      requested_voice:resolved.voiceName,
      detail:"No usable ElevenLabs voice was resolved and OpenAI TTS fallback is unavailable.",
    },{status:503});
  }

  async function synthesize(voiceId:string){
    if(!apiKey) return new Response(null,{status:503});
    return fetch("https://api.elevenlabs.io/v1/text-to-speech/"+encodeURIComponent(voiceId),{
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
  }

  let activeVoiceId=resolved.voiceId;
  let voiceSource=resolved.source;
  let providerUsed="elevenlabs";
  let r=FORCE_OPENAI.has(agentId)
    ? new Response(null,{status:503})
    : activeVoiceId && apiKey
      ? await synthesize(activeVoiceId)
      : new Response(null,{status:503});

  if(!r.ok && agentId!=="simon" && agentId!=="marie" && !FORCE_OPENAI.has(agentId)){
    for(const candidate of resolved.alternatives){
      if(candidate.voice_id===activeVoiceId) continue;
      const retry=await synthesize(candidate.voice_id);
      if(retry.ok){
        r=retry;
        activeVoiceId=candidate.voice_id;
        voiceSource="account_retry";
        break;
      }
    }
  }

  if(!r.ok && openaiKey){
    const openaiVoice=OPENAI_VOICES[agentId];
    const openaiRes=await fetch("https://api.openai.com/v1/audio/speech",{
      method:"POST",
      headers:{
        "Authorization":"Bearer "+openaiKey,
        "Content-Type":"application/json",
        "Accept":"audio/mpeg",
      },
      body:JSON.stringify({
        model:"gpt-4o-mini-tts",
        input:text,
        voice:openaiVoice,
        instructions:OPENAI_STYLE[agentId],
        speed:agentId==="eyes"?1.08:1,
        response_format:"mp3",
      }),
    });

    if(openaiRes.ok){
      r=openaiRes;
      activeVoiceId=openaiVoice;
      voiceSource=FORCE_OPENAI.has(agentId)?"openai_primary":"openai_fallback";
      providerUsed="openai";
    }else{
      const elevenDetail=await r.text().catch(()=>"");
      const openaiDetail=await openaiRes.text().catch(()=>"");
      return NextResponse.json({
        error:"NERVS_VOICE_PROVIDERS_REJECTED",
        agent_id:agentId,
        requested_voice:resolved.voiceName,
        elevenlabs_status:r.status,
        elevenlabs_detail:elevenDetail.slice(0,400),
        openai_status:openaiRes.status,
        openai_detail:openaiDetail.slice(0,400),
      },{status:502});
    }
  }else if(!r.ok){
    const detail=await r.text().catch(()=>"");
    return NextResponse.json({
      error:"NERVS_VOICE_PROVIDER_REJECTED",
      agent_id:agentId,
      requested_voice:resolved.voiceName,
      voice_id:activeVoiceId,
      provider_status:r.status,
      detail:detail.slice(0,600),
    },{status:502});
  }

  const audio=Buffer.from(await r.arrayBuffer()).toString("base64");
  return NextResponse.json({
    status:"AUDIO_READY",
    agent_id:agentId,
    voice_name:resolved.voiceName,
    voice_id:activeVoiceId,
    voice_source:voiceSource,
    provider:providerUsed,
    content_type:"audio/mpeg",
    audio_base64:audio,
  });
}
