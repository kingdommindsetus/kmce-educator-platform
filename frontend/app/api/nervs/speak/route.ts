import {NextResponse} from "next/server";
import {requireFounder} from "../../../../lib/auth";

export const runtime="nodejs";

const OPENAI_VOICES={
  simon:"cedar",
  marie:"marin",
  eyes:"nova",
  mark:"onyx",
  cammy:"coral",
  eve:"shimmer",
  tube:"verse",
  lucy:"alloy",
  snake:"ash",
  alice:"ballad",
  echo:"echo",
  booker:"coral",
} as const;

type AgentId=keyof typeof OPENAI_VOICES;

const OPENAI_STYLE:Record<AgentId,string>={
  simon:"Speak like a polished executive orchestrator: calm, authoritative, measured, and clear.",
  marie:"Speak warmly, professionally, and reassuringly like an executive operations lead.",
  eyes:"Speak with strong projection, crisp confidence, and noticeable energy like a sharp market-intelligence lead briefing executives. Never sound soft or subdued.",
  mark:"Speak with strong confidence, upbeat executive energy, and clear projection like a strategic marketing director presenting a decisive recommendation.",
  cammy:"Speak upbeat, professional, energetic, and numbers-aware like a campaign director.",
  eve:"Speak polished, refined, confident, and brand-conscious with clear projection.",
  tube:"Speak energetic, creator-friendly, engaging, and confident without sounding exaggerated.",
  lucy:"Speak bright, energetic, social, and audience-aware with clear projection.",
  snake:"Speak analytical, controlled, precise, and confident like a growth-measurement lead.",
  alice:"Speak clearly, professionally, and confidently like a storefront and website quality lead.",
  echo:"Speak smoothly, confidently, and persuasively like a trusted sales-outreach professional.",
  booker:"Speak in a clearly feminine, warm, polished scheduling-coordinator voice. Sound friendly, organized, upbeat, professional, and easy to hear.",
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

export async function POST(req:Request){
  const founder=await requireFounder();
  if(!founder) return NextResponse.json({error:"Founder access required"},{status:403});

  const openaiKey=process.env.OPENAI_API_KEY;
  if(!openaiKey){
    return NextResponse.json({error:"NERVS_TTS_NOT_CONFIGURED"},{status:503});
  }

  const body=await req.json().catch(()=>({}));
  const agentId=String(body.agent_id||"").toLowerCase() as AgentId;
  const text=String(body.text||"").trim();

  if(!(agentId in OPENAI_VOICES)){
    return NextResponse.json({error:"Unknown NERVS agent"},{status:400});
  }
  if(!text){
    return NextResponse.json({error:"Text required"},{status:400});
  }
  if(text.length>1200){
    return NextResponse.json({error:"Text must be 1200 characters or fewer"},{status:400});
  }

  const voice=OPENAI_VOICES[agentId];
  const r=await fetch("https://api.openai.com/v1/audio/speech",{
    method:"POST",
    headers:{
      "Authorization":"Bearer "+openaiKey,
      "Content-Type":"application/json",
      "Accept":"audio/mpeg",
    },
    body:JSON.stringify({
      model:"gpt-4o-mini-tts",
      input:text,
      voice,
      instructions:OPENAI_STYLE[agentId],
      speed:SPEED[agentId],
      response_format:"mp3",
    }),
  });

  if(!r.ok){
    const detail=await r.text().catch(()=>"");
    return NextResponse.json({
      error:"NERVS_TTS_REJECTED",
      agent_id:agentId,
      voice,
      provider_status:r.status,
      detail:detail.slice(0,600),
    },{status:502});
  }

  const audio=Buffer.from(await r.arrayBuffer()).toString("base64");
  return NextResponse.json({
    status:"AUDIO_READY",
    agent_id:agentId,
    voice_name:voice,
    voice_id:voice,
    voice_source:"openai_locked",
    provider:"openai",
    content_type:"audio/mpeg",
    audio_base64:audio,
  });
}
