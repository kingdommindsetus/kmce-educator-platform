import {NextResponse} from "next/server";
import {requireFounder} from "../../../../../../lib/auth";
import {ensureSchema,sql} from "../../../../../../lib/db";
export const runtime="nodejs";
export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){
 const founder=await requireFounder(); if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
 await ensureSchema(); const q=sql(); const id=Number((await params).id);
 const rows:any=await q`SELECT * FROM content_assets WHERE id=${id} LIMIT 1`; if(!rows.length)return NextResponse.json({error:"Asset not found"},{status:404});
 if(rows[0].status!=="APPROVED")return NextResponse.json({error:"Founder-approved content required",reason:"NOT_APPROVED"},{status:409});
 return NextResponse.json({ok:true,publish_eligible:true,provider_configured:false,message:"Sofia publish gate passed. No external post was published because a provider is not configured."});
}
