import {NextRequest,NextResponse} from "next/server";
import {requireFounder} from "../../../../lib/auth";
import {ensureSchema,sql} from "../../../../lib/db";
export const runtime="nodejs"; export const dynamic="force-dynamic";

export async function GET(req:NextRequest){
 const founder=await requireFounder(); if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
 await ensureSchema(); const q=sql(); const query=String(req.nextUrl.searchParams.get("q")||"").trim(); const limit=Math.max(1,Math.min(25,Number(req.nextUrl.searchParams.get("limit")||10)));
 if(!query)return NextResponse.json({error:"q required"},{status:400});
 const rows:any=await q`SELECT id,source_type,source_path,title,is_canonical,metadata,synced_at,ts_rank(to_tsvector('english',coalesce(title,'')||' '||content),plainto_tsquery('english',${query})) AS rank,substring(content from 1 for 1200) AS excerpt FROM knowledge_documents WHERE to_tsvector('english',coalesce(title,'')||' '||content) @@ plainto_tsquery('english',${query}) ORDER BY is_canonical DESC,rank DESC,synced_at DESC LIMIT ${limit}`;
 return NextResponse.json({query,results:rows});
}
