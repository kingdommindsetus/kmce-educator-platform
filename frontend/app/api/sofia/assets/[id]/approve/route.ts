import {NextResponse} from "next/server";
import {requireFounder} from "../../../../../../lib/auth";
import {ensureSchema,sql} from "../../../../../../lib/db";
export const runtime="nodejs";
export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){
 const founder=await requireFounder(); if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
 await ensureSchema(); const q=sql(); const id=Number((await params).id);
 const rows:any=await q`UPDATE content_assets SET status='APPROVED',approved_by=${founder.email},approved_at=now(),updated_at=now() WHERE id=${id} AND status IN ('DRAFT','PENDING_APPROVAL') RETURNING *`;
 if(!rows.length)return NextResponse.json({error:"Asset not found or not approvable"},{status:409});
 return NextResponse.json({asset:rows[0],published:false});
}
