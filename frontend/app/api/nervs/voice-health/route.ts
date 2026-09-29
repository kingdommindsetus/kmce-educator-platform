import {NextResponse} from "next/server";
import {requireFounder} from "../../../../lib/auth";

export const runtime="nodejs";

const CHECKS=[
  {agent:"simon",voiceId:"3WqHLnw80rOZqJzW9YRB"},
  {agent:"marie",voiceId:"EXAVITQu4vr4xnSDxMaL"},
];

export async function GET(){
  if(process.env.VERCEL_ENV!=="preview"){
    const founder=await requireFounder();
    if(!founder) return NextResponse.json({error:"Founder access required"},{status:403});
  }

  const apiKey=process.env.ELEVENLABS_API_KEY;
  if(!apiKey) return NextResponse.json({status:"MISSING_KEY"},{status:503});

  const userRes=await fetch("https://api.elevenlabs.io/v1/user",{
    headers:{"xi-api-key":apiKey,"Accept":"application/json"},
    cache:"no-store",
  });
  const userText=await userRes.text().catch(()=>"");
  let userCode="";
  try{
    const parsed=JSON.parse(userText);
    userCode=String(parsed?.detail?.code||parsed?.detail?.status||parsed?.code||"");
  }catch{}

  const voiceResults=[] as Array<Record<string,unknown>>;
  for(const item of CHECKS){
    const r=await fetch("https://api.elevenlabs.io/v1/voices/"+item.voiceId,{
      headers:{"xi-api-key":apiKey,"Accept":"application/json"},
      cache:"no-store",
    });
    const text=await r.text().catch(()=>"");
    let name="";
    let code="";
    try{
      const parsed=JSON.parse(text);
      name=String(parsed?.name||"");
      code=String(parsed?.detail?.code||parsed?.detail?.status||parsed?.code||"");
    }catch{}
    voiceResults.push({
      agent:item.agent,
      voice_id:item.voiceId,
      status:r.status,
      ok:r.ok,
      name,
      code,
    });
  }

  return NextResponse.json({
    status:userRes.ok?"KEY_VALID":"KEY_REJECTED",
    user_status:userRes.status,
    user_code:userCode,
    voices:voiceResults,
  });
}
