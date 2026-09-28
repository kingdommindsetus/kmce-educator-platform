import {NextResponse} from "next/server";
import {ensureSchema,sql} from "../../../../../lib/db";
import {requireFounder} from "../../../../../lib/auth";

export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){
 const u=await requireFounder(); if(!u)return NextResponse.json({error:"forbidden"},{status:403});
 await ensureSchema(); const q=sql(); const id=Number((await params).id);
 const rows=await q`SELECT o.*,l.email,l.pipeline_stage,l.contact_source_url,l.contact_verified_at
 FROM outreach_jobs o JOIN leads l ON l.id=o.lead_id WHERE o.id=${id}`;
 if(!rows.length)return NextResponse.json({error:"Outreach job not found"},{status:404});
 const job=rows[0];
 if(job.status==='SENT'||job.sent_at)return NextResponse.json({error:"Already sent; duplicate send blocked"},{status:409});
 if(job.status!=='APPROVED'||job.pipeline_stage!=='APPROVED')return NextResponse.json({error:"Founder-approved outreach required"},{status:409});
 if(!job.email||!job.contact_source_url||!job.contact_verified_at)return NextResponse.json({error:"Verified recipient, official source, and verification timestamp required"},{status:409});
 return NextResponse.json({ok:true,send_eligible:true,provider_configured:false,message:"Echo gate passed. No external message was sent because a delivery provider is not configured."});
}
