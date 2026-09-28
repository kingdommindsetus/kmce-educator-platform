import {NextResponse} from "next/server";
import {requireFounder} from "../../../../lib/auth";
export const runtime="nodejs";
export async function POST(req:Request){
 const founder=await requireFounder(); if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
 const apiKey=process.env.ELEVENLABS_API_KEY,voiceId=process.env.ELEVENLABS_VOICE_ID; if(!apiKey||!voiceId)return NextResponse.json({error:"Simon voice provider is not configured"},{status:503});
 const body=await req.json().catch(()=>({})),text=String(body.text||"").trim(); if(!text)return NextResponse.json({error:"Text required"},{status:400});
 const r=await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,{method:"POST",headers:{"xi-api-key":apiKey,"Content-Type":"application/json","Accept":"audio/mpeg"},body:JSON.stringify({text,model_id:"eleven_multilingual_v2",voice_settings:{stability:.58,similarity_boost:.82,style:.18,use_speaker_boost:true}})});
 if(!r.ok)return NextResponse.json({error:"Simon voice provider rejected the request"},{status:502}); const audio=Buffer.from(await r.arrayBuffer()).toString("base64"); return NextResponse.json({status:"AUDIO_READY",content_type:"audio/mpeg",audio_base64:audio});
}