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

async function resolveVoiceId(agentId:keyof typeof VOICES){
  return {voiceId:VOICES[agentId],voiceName:agentId,source:"fixed_agent_voice"};
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

  const resolved=await resolveVoiceId(agentId);


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

  async function synthesize(voiceId:string){
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
  let r=await synthesize(activeVoiceId);

  if(!r.ok){
    const fallbackId="pNInz6obpgDQGcFmaJgB";
    if(fallbackId && fallbackId!==activeVoiceId){
      r=await synthesize(fallbackId);
      if(r.ok){
        activeVoiceId=fallbackId;
        voiceSource="universal_fallback";
      }
    }
  }

  if(!r.ok){
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
    content_type:"audio/mpeg",
    audio_base64:audio,
  });
}
