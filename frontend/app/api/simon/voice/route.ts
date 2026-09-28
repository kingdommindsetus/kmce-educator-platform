import { NextResponse } from "next/server";
import { requireFounder } from "../../../../lib/auth";
import { ensureSchema,sql } from "../../../../lib/db";
export async function GET(){
 const founder=await requireFounder(); if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
 await ensureSchema(); const q=sql();
 const rows:any=await q`SELECT brief_date,voice_script,audio_status,audio_url,audio_generated_at,created_at FROM executive_briefs ORDER BY brief_date DESC LIMIT 1`;
 if(!rows.length)return NextResponse.json({status:"NO_FROZEN_BRIEF",message:"No frozen Simon brief exists yet."});
 return NextResponse.json({created_by:"Simon",...rows[0]});
}