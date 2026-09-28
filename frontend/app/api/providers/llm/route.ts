import {NextResponse} from "next/server";
import {requireFounder} from "../../../../lib/auth";
import {ensureSchema,sql} from "../../../../lib/db";
export const runtime="nodejs";

export async function POST(req:Request){
 const founder=await requireFounder(); if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
 const base=String(process.env.OMNIROUTE_BASE_URL||"").replace(/\/$/,""); if(!base)return NextResponse.json({error:"OmniRoute is not configured"},{status:503});
 const b:any=await req.json().catch(()=>({})); const messages=Array.isArray(b.messages)?b.messages:[]; if(!messages.length)return NextResponse.json({error:"messages required"},{status:400});
 const model=String(b.model||process.env.OMNIROUTE_MODEL||"auto"); const headers:any={"Content-Type":"application/json"}; if(process.env.OMNIROUTE_API_KEY)headers.Authorization=`Bearer ${process.env.OMNIROUTE_API_KEY}`;
 await ensureSchema(); const q=sql(); const start=Date.now(); let status="SUCCESS"; let errorText:string|null=null; let json:any=null;
 try{const r=await fetch(base+"/v1/chat/completions",{method:"POST",headers,body:JSON.stringify({model,messages,temperature:Number.isFinite(Number(b.temperature))?Number(b.temperature):0.2})});json=await r.json().catch(()=>({}));if(!r.ok){status="ERROR";errorText=String(json?.error?.message||json?.error||`HTTP ${r.status}`);}}catch(e:any){status="ERROR";errorText=String(e?.message||e)}
 await q`INSERT INTO provider_calls(capability,provider_name,status,duration_ms,request_metadata,result_metadata,error_text) VALUES('llm.generate','OmniRoute',${status},${Date.now()-start},${JSON.stringify({model,message_count:messages.length})}::jsonb,${JSON.stringify({has_choice:Boolean(json?.choices?.length)})}::jsonb,${errorText})`;
 if(status==="ERROR")return NextResponse.json({error:errorText||"OmniRoute request failed"},{status:502});
 return NextResponse.json({provider:"OmniRoute",model,response:json});
}
