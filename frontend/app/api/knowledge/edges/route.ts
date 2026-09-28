import {NextRequest,NextResponse} from "next/server";
import {requireFounder} from "../../../../lib/auth";
import {ensureSchema,sql} from "../../../../lib/db";
export const runtime="nodejs"; export const dynamic="force-dynamic";

export async function POST(req:NextRequest){
 const founder=await requireFounder(); if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
 await ensureSchema(); const q=sql(); const b:any=await req.json().catch(()=>({}));
 if(!b.subject||!b.predicate||!b.object)return NextResponse.json({error:"subject, predicate, object required"},{status:400});
 const status=String(b.relation_status||"EXTRACTED").toUpperCase(); if(!["EXTRACTED","INFERRED","AMBIGUOUS"].includes(status))return NextResponse.json({error:"invalid relation_status"},{status:400});
 const rows:any=await q`INSERT INTO knowledge_edges(subject,predicate,object,confidence,relation_status,evidence_document_id,metadata,created_by) VALUES(${String(b.subject)},${String(b.predicate)},${String(b.object)},${Math.max(0,Math.min(100,Number(b.confidence??100)))},${status},${b.evidence_document_id?Number(b.evidence_document_id):null},${JSON.stringify(b.metadata||{})}::jsonb,${founder.email}) RETURNING *`;
 return NextResponse.json({edge:rows[0]});
}

export async function GET(req:NextRequest){
 const founder=await requireFounder(); if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
 await ensureSchema(); const q=sql(); const term=String(req.nextUrl.searchParams.get("q")||"").trim(); if(!term)return NextResponse.json({error:"q required"},{status:400});
 const like="%"+term+"%"; const rows:any=await q`SELECT * FROM knowledge_edges WHERE subject ILIKE ${like} OR predicate ILIKE ${like} OR object ILIKE ${like} ORDER BY CASE relation_status WHEN 'EXTRACTED' THEN 0 WHEN 'INFERRED' THEN 1 ELSE 2 END,confidence DESC,created_at DESC LIMIT 50`;
 return NextResponse.json({query:term,results:rows});
}
