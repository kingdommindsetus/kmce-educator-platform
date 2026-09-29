import {NextResponse} from "next/server";
import {requireFounder} from "../../../../lib/auth";

export const runtime="nodejs";

const MAX_AUDIO_BYTES=15*1024*1024;

export async function POST(req:Request){
  const founder=await requireFounder();
  if(!founder) return NextResponse.json({error:"Founder access required"},{status:403});

  const apiKey=String(process.env.OPENAI_API_KEY||"").trim();
  if(!apiKey) return NextResponse.json({error:"OPENAI_API_KEY is not configured"},{status:503});

  const incoming=await req.formData().catch(()=>null);
  const file=incoming?.get("audio");
  if(!(file instanceof File)) return NextResponse.json({error:"Audio file required"},{status:400});
  if(!file.size) return NextResponse.json({error:"Audio file is empty"},{status:400});
  if(file.size>MAX_AUDIO_BYTES) return NextResponse.json({error:"Audio file too large"},{status:413});

  const form=new FormData();
  form.set("file",file,file.name||"kmce-live.webm");
  form.set("model",String(process.env.OPENAI_TRANSCRIBE_MODEL||"gpt-transcribe"));
  form.set("language","en");
  form.set(
    "prompt",
    "KMCE, Kingdom Mindset CE, Simon, Snake, Marie, Eyes, Booker, Eve, Lucy, dental sleep medicine, AGD PACE, Dr. Timothy Adams."
  );

  const r=await fetch("https://api.openai.com/v1/audio/transcriptions",{
    method:"POST",
    headers:{Authorization:`Bearer ${apiKey}`},
    body:form,
    cache:"no-store",
  });

  const data=await r.json().catch(()=>({}));
  if(!r.ok){
    return NextResponse.json({
      error:"TRANSCRIPTION_PROVIDER_REJECTED",
      provider_status:r.status,
      detail:String(data?.error?.message||"Transcription failed").slice(0,500),
    },{status:502});
  }

  const text=String(data?.text||"").trim();
  return NextResponse.json({status:"TRANSCRIBED",text,model:String(process.env.OPENAI_TRANSCRIBE_MODEL||"gpt-transcribe")});
}
