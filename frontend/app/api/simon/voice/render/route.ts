import { NextRequest,NextResponse } from "next/server";
import { requireFounder } from "../../../../lib/auth";
import { ensureSchema,sql } from "../../../../lib/db";

export const runtime="nodejs";

export async function GET(){
 const founder=await requireFounder(); if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
 await ensureSchema(); const q=sql();
 const rows:any=await q`SELECT id,brief_date,voice_script,audio_status,audio_url,audio_generated_at,created_at FROM executive_briefs ORDER BY brief_date DESC LIMIT 1`;
 if(!rows.length)return NextResponse.json({status:"NO_FROZEN_BRIEF",message:"No frozen Simon brief exists yet."});
 return NextResponse.json({created_by:"Simon",provider:"elevenlabs",configured:Boolean(process.env.ELEVENLABS_API_KEY&&process.env.ELEVENLABS_VOICE_ID),...rows[0]});
}

export async function POST(req:NextRequest){
 const founder=await requireFounder(); if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
 const apiKey=process.env.ELEVENLABS_API_KEY,voiceId=process.env.ELEVENLABS_VOICE_ID;
 if(!apiKey||!voiceId)return NextResponse.json({error:"Simon voice provider is not configured"},{status:503});
 await ensureSchema(); const q=sql();
 const body=await req.json().catch(()=>({}));
 const rows:any=body.brief_id
   ? await q`SELECT id,brief_date,voice_script,audio_status FROM executive_briefs WHERE id=${Number(body.brief_id)} LIMIT 1`
   : await q`SELECT id,brief_date,voice_script,audio_status FROM executive_briefs ORDER BY brief_date DESC LIMIT 1`;
 if(!rows.length)return NextResponse.json({error:"No frozen Simon brief exists"},{status:404});
 const brief=rows[0];
 const script=String(brief.voice_script||"").trim();
 if(!script)return NextResponse.json({error:"Frozen brief has no voice script"},{status:409});
 await q`UPDATE executive_briefs SET audio_status='GENERATING' WHERE id=${brief.id}`;
 try{
   const response=await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,{
     method:"POST",
     headers:{"xi-api-key":apiKey,"Content-Type":"application/json","Accept":"audio/mpeg"},
     body:JSON.stringify({
       text:script,
       model_id:"eleven_multilingual_v2",
       voice_settings:{stability:0.58,similarity_boost:0.82,style:0.18,use_speaker_boost:true}
     })
   });
   if(!response.ok){
     const detail=(await response.text()).slice(0,500);
     await q`UPDATE executive_briefs SET audio_status='ERROR' WHERE id=${brief.id}`;
     return NextResponse.json({error:"ElevenLabs rendering failed",provider_status:response.status,detail},{status:502});
   }
   const bytes=new Uint8Array(await response.arrayBuffer());
   const base64=Buffer.from(bytes).toString("base64");
   await q`UPDATE executive_briefs SET audio_status='AUDIO_READY',audio_generated_at=now() WHERE id=${brief.id}`;
   return NextResponse.json({created_by:"Simon",brief_id:brief.id,brief_date:brief.brief_date,status:"AUDIO_READY",content_type:"audio/mpeg",audio_base64:base64});
 }catch{
   await q`UPDATE executive_briefs SET audio_status='ERROR' WHERE id=${brief.id}`;
   return NextResponse.json({error:"Simon voice rendering failed"},{status:502});
 }
}