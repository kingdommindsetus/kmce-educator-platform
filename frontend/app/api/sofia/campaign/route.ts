import {NextResponse} from "next/server";
import {requireFounder} from "../../../../lib/auth";
import {ensureSchema,sql} from "../../../../lib/db";
import {buildGrowthPlan} from "../../../../lib/simon/sofia-v1";
export const runtime="nodejs";

export async function POST(req:Request){
 const founder=await requireFounder(); if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
 await ensureSchema(); const q=sql(); const body:any=await req.json().catch(()=>({}));
 const plan:any=buildGrowthPlan(body); if(!plan.ok)return NextResponse.json({error:"Sofia plan gate failed",reason:plan.reason},{status:400});
 const status=body.activate?"ACTIVE":"DRAFT";
 const rows:any=await q`INSERT INTO growth_campaigns(name,objective,audience,service_code,channels,status,created_by) VALUES(${body.name||plan.objective},${plan.objective},${plan.audience},${body.service_code||null},${JSON.stringify(plan.channels)}::jsonb,${status},${founder.email}) RETURNING *`;
 const campaign=rows[0]; const assets:any[]=[];
 for(const a of plan.assets){
  const x:any=await q`INSERT INTO content_assets(campaign_id,channel,asset_type,title,body,status,metadata) VALUES(${campaign.id},${a.channel},${a.asset_type},${a.title},${a.body},'DRAFT',${JSON.stringify({generated_by:"Sofia",verified_facts_only:true})}::jsonb) RETURNING *`;
  assets.push(x[0]);
 }
 return NextResponse.json({campaign,assets,publish_provider_configured:false});
}
