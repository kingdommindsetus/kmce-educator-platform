import {NextResponse} from "next/server";
import {requireFounder} from "../../../../lib/auth";
import {ensureSchema,sql} from "../../../../lib/db";
export const runtime="nodejs";

export async function POST(req:Request){
 const founder=await requireFounder(); if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
 const key=process.env.FIRECRAWL_API_KEY; if(!key)return NextResponse.json({error:"Firecrawl is not configured",provider:"Firecrawl"},{status:503});
 const b:any=await req.json().catch(()=>({})); const query=String(b.query||"").trim(); const limit=Math.max(1,Math.min(25,Number(b.limit||10)));
 if(!query)return NextResponse.json({error:"query required"},{status:400});
 await ensureSchema(); const q=sql(); const start=Date.now(); let status="SUCCESS"; let errorText:string|null=null; let json:any=null;
 try{
  const r=await fetch("https://api.firecrawl.dev/v2/search",{method:"POST",headers:{"Authorization":`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({query,limit})});
  json=await r.json().catch(()=>({})); if(!r.ok){status="ERROR";errorText=String(json?.error||json?.message||`HTTP ${r.status}`);}
 }catch(e:any){status="ERROR";errorText=String(e?.message||e);}
 const duration=Date.now()-start;
 const data=Array.isArray(json)?json:(json?.data?.web||json?.data||json?.results||[]);
 const results=Array.isArray(data)?data.map((x:any)=>({title:x.title||null,url:x.url||x.sourceURL||null,description:x.description||null,markdown:x.markdown||null})).filter((x:any)=>x.url):[];
 await q`INSERT INTO provider_calls(capability,provider_name,status,duration_ms,request_metadata,result_metadata,error_text) VALUES('web.search','Firecrawl',${status},${duration},${JSON.stringify({query,limit})}::jsonb,${JSON.stringify({result_count:results.length})}::jsonb,${errorText})`;
 if(status==="ERROR")return NextResponse.json({error:errorText||"Firecrawl search failed",provider:"Firecrawl"},{status:502});
 return NextResponse.json({provider:"Firecrawl",query,results});
}
