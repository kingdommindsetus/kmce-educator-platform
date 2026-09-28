import {NextResponse} from "next/server";
import {requireFounder} from "../../../../lib/auth";
import {ensureSchema,sql} from "../../../../lib/db";
export const runtime="nodejs";
export async function POST(req:Request){
 const founder=await requireFounder(); if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
 await ensureSchema(); const q=sql(); const b:any=await req.json().catch(()=>({})); const campaignId=Number(b.campaign_id||0);
 if(!campaignId||!b.channel||!b.metric_date)return NextResponse.json({error:"campaign_id, channel, metric_date required"},{status:400});
 const rows:any=await q`INSERT INTO growth_metrics(campaign_id,channel,metric_date,impressions,clicks,leads,conversions,spend_minor,metadata) VALUES(${campaignId},${String(b.channel).toLowerCase()},${b.metric_date},${Number(b.impressions||0)},${Number(b.clicks||0)},${Number(b.leads||0)},${Number(b.conversions||0)},${Number(b.spend_minor||0)},${JSON.stringify(b.metadata||{})}::jsonb) ON CONFLICT(campaign_id,channel,metric_date) DO UPDATE SET impressions=EXCLUDED.impressions,clicks=EXCLUDED.clicks,leads=EXCLUDED.leads,conversions=EXCLUDED.conversions,spend_minor=EXCLUDED.spend_minor,metadata=EXCLUDED.metadata,updated_at=now() RETURNING *`;
 return NextResponse.json({metric:rows[0]});
}
