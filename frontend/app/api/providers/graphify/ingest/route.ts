import {NextResponse} from "next/server";
import {requireFounder} from "../../../../../lib/auth";
import {ensureSchema,sql} from "../../../../../lib/db";
export const runtime="nodejs";

export async function POST(req:Request){
 const founder=await requireFounder(); if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
 await ensureSchema(); const q=sql(); const b:any=await req.json().catch(()=>({})); const edges=Array.isArray(b.edges)?b.edges.slice(0,500):[];
 if(!edges.length)return NextResponse.json({error:"edges required"},{status:400}); const out:any[]=[];
 for(const e of edges){
  if(!e.subject||!e.predicate||!e.object)continue; const rs=String(e.relation_status||e.confidence_label||"EXTRACTED").toUpperCase(); const relation=["EXTRACTED","INFERRED","AMBIGUOUS"].includes(rs)?rs:"AMBIGUOUS";
  const rows:any=await q`INSERT INTO knowledge_edges(subject,predicate,object,confidence,relation_status,evidence_document_id,metadata,created_by) VALUES(${String(e.subject)},${String(e.predicate)},${String(e.object)},${Math.max(0,Math.min(100,Number(e.confidence??50)))},${relation},${e.evidence_document_id?Number(e.evidence_document_id):null},${JSON.stringify({...e.metadata,provider:"Graphify"})}::jsonb,'Graphify') RETURNING id,subject,predicate,object,confidence,relation_status`;
  out.push(rows[0]);
 }
 await q`INSERT INTO provider_calls(capability,provider_name,status,request_metadata,result_metadata) VALUES('relationship.enrich','Graphify','SUCCESS',${JSON.stringify({edge_count:edges.length})}::jsonb,${JSON.stringify({inserted:out.length})}::jsonb)`;
 return NextResponse.json({inserted:out.length,edges:out});
}
