import {createHash} from "node:crypto";
import {NextResponse} from "next/server";
import {requireFounder} from "../../../../lib/auth";
import {ensureSchema,sql} from "../../../../lib/db";
export const runtime="nodejs";

export async function POST(req:Request){
 const founder=await requireFounder(); if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
 await ensureSchema(); const q=sql(); const b:any=await req.json().catch(()=>({})); const docs=Array.isArray(b.documents)?b.documents.slice(0,200):[];
 if(!docs.length)return NextResponse.json({error:"documents required"},{status:400});
 const results:any[]=[];
 for(const d of docs){
  const sourceType=String(d.source_type||"OBSIDIAN").toUpperCase(); const sourcePath=String(d.source_path||"").trim(); const content=String(d.content||"");
  if(!sourcePath||!content){results.push({source_path:sourcePath,error:"source_path and content required"});continue;}
  const checksum=createHash("sha256").update(content).digest("hex");
  const rows:any=await q`INSERT INTO knowledge_documents(source_type,source_path,title,content,checksum,is_canonical,metadata,source_updated_at,synced_at) VALUES(${sourceType},${sourcePath},${d.title||null},${content},${checksum},${d.is_canonical!==false},${JSON.stringify(d.metadata||{})}::jsonb,${d.source_updated_at||null},now()) ON CONFLICT(source_type,source_path) DO UPDATE SET title=EXCLUDED.title,content=EXCLUDED.content,checksum=EXCLUDED.checksum,is_canonical=EXCLUDED.is_canonical,metadata=EXCLUDED.metadata,source_updated_at=EXCLUDED.source_updated_at,synced_at=now() RETURNING id,source_type,source_path,title,checksum,is_canonical,synced_at`;
  results.push(rows[0]);
 }
 return NextResponse.json({synced:results.filter(x=>!x.error).length,rejected:results.filter(x=>x.error).length,results});
}
