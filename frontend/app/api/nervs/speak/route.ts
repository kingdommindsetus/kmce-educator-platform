import {NextResponse} from "next/server";
import {requireFounder} from "../../../../lib/auth";

export const runtime="nodejs";

const VOICES={
  mark:"IKne3meq5aSn9XLyUdCD",
  tube:"TX3LPaxmHKxFdv7VOQHJ",
  lucy:"cgSgspJ2msm6clMCkdW9",
  booker:"CwhRBWXzGAHq8TQ4Fs17",
  alice:"Xb7hH8MSUJpSbSDYk0k2",
  snake:"k5eu7V3cPJkEA7D2irmP",
} as const;

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

  const voiceId=VOICES[agentId];
  const r=await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,{
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
    return NextResponse.json({error:"NERVS voice provider rejected the request",detail:detail.slice(0,300)},{status:502});
  }

  const audio=Buffer.from(await r.arrayBuffer()).toString("base64");
  return NextResponse.json({
    status:"AUDIO_READY",
    agent_id:agentId,
    content_type:"audio/mpeg",
    audio_base64:audio,
  });
}
