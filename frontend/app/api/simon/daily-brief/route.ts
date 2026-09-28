import { NextResponse } from "next/server";
import { requireFounder } from "../../../../lib/auth";
import { ensureSchema,sql } from "../../../../lib/db";

const money=(minor:number,currency:string)=>new Intl.NumberFormat("en-US",{style:"currency",currency:(currency||"usd").toUpperCase()}).format(minor/100);

async function buildBrief(){
 const founder=await requireFounder(); if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
 await ensureSchema(); const q=sql();
 const tx:any=await q`SELECT product_type,product_name,quantity,amount_minor,currency,status,occurred_at FROM commerce_transactions WHERE occurred_at>=date_trunc('day',now() AT TIME ZONE 'America/New_York')-interval '1 day' AND occurred_at<date_trunc('day',now() AT TIME ZONE 'America/New_York') AND status IN ('succeeded','paid') ORDER BY occurred_at`;
 const leads:any=await q`SELECT pipeline_stage,count(*)::int count FROM leads GROUP BY pipeline_stage`;
 const activity:any=await q`SELECT actor_name,count(*)::int count FROM lead_activities WHERE created_at>=date_trunc('day',now() AT TIME ZONE 'America/New_York')-interval '1 day' AND created_at<date_trunc('day',now() AT TIME ZONE 'America/New_York') GROUP BY actor_name ORDER BY count DESC`;
 const stripe:any=await q`SELECT count(*)::int event_count,max(processed_at) last_event_at FROM stripe_webhook_events`;
 const unclassified:any=await q`SELECT count(*)::int count FROM commerce_transactions WHERE provider='stripe' AND status IN ('succeeded','paid') AND product_type='UNCLASSIFIED'`;
 const failedTx:any=await q`SELECT count(*)::int count FROM commerce_transactions WHERE provider='stripe' AND status='failed' AND occurred_at>=now()-interval '24 hours'`;
 const gross=tx.reduce((n:number,x:any)=>n+Number(x.amount_minor),0), units=tx.reduce((n:number,x:any)=>n+Number(x.quantity||1),0), currency=tx[0]?.currency||"usd";
 const exceptions:string[]=[]; if(Number(unclassified[0]?.count||0)>0)exceptions.push(`${unclassified[0].count} paid Stripe sale(s) need product classification`); if(Number(failedTx[0]?.count||0)>0)exceptions.push(`${failedTx[0].count} Stripe payment failure(s) recorded in the last 24 hours`);
 const leadTotal=leads.reduce((n:number,x:any)=>n+Number(x.count),0);
 const products=tx.length?tx.map((x:any)=>`${x.quantity||1} ${x.product_name||x.product_type}`).join(", "):"no completed sales";
 const agents=activity.length?activity.map((x:any)=>`${x.actor_name}: ${x.count} recorded action${x.count===1?"":"s"}`).join("; "):"No agent activity was recorded yesterday.";
 const blockers=exceptions.length?exceptions.join(". "):"No Stripe exceptions are currently recorded.";
 const voiceScript=`Good morning, Kimberly. Here is your KMCE executive brief. Yesterday's recorded revenue was ${money(gross,currency)} across ${tx.length} completed transaction${tx.length===1?"":"s"} and ${units} unit${units===1?"":"s"}. Sales: ${products}. The CRM currently contains ${leadTotal} leads. Agent activity: ${agents} Exceptions and blockers: ${blockers} Today's priority is to move verified opportunities forward while protecting data quality and revenue attribution. Finish, prove, systemize, scale.`;
 const health={configured:Boolean(process.env.STRIPE_SECRET_KEY&&process.env.STRIPE_WEBHOOK_SECRET),event_count:Number(stripe[0]?.event_count||0),last_event_at:stripe[0]?.last_event_at||null,unclassified_paid_sales:Number(unclassified[0]?.count||0),failed_payments_24h:Number(failedTx[0]?.count||0),exceptions};
 return {created_by:"Simon",period:"previous_day",voice:{status:"SCRIPT_READY",script:voiceScript,audio_url:null,note:"Simon Voice v1 freezes the factual spoken script. Audio synthesis is intentionally not claimed until a voice provider is configured."},stripe_health:health,metrics:{transactions:tx.length,units,gross_amount_minor:gross,currency,lead_stages:Object.fromEntries(leads.map((x:any)=>[x.pipeline_stage,x.count])),agent_activity:Object.fromEntries(activity.map((x:any)=>[x.actor_name,x.count]))},transactions:tx};
}

export async function GET(){
 const founder=await requireFounder(); if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
 return NextResponse.json(await buildBrief());
}

export async function POST(){
 const founder=await requireFounder(); if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
 const data:any=await buildBrief(); const q=sql();
 const window:any=await q`SELECT (date_trunc('day',now() AT TIME ZONE 'America/New_York')-interval '1 day')::date brief_date,(date_trunc('day',now() AT TIME ZONE 'America/New_York')-interval '1 day') AT TIME ZONE 'America/New_York' period_start,date_trunc('day',now() AT TIME ZONE 'America/New_York') AT TIME ZONE 'America/New_York' period_end`;
 const w=window[0],metrics=JSON.stringify(data.metrics),snapshot=JSON.stringify({metrics:data.metrics,stripe_health:data.stripe_health,transactions:data.transactions});
 const written=`Simon executive brief for ${w.brief_date}. Recorded transactions: ${data.metrics.transactions}. Recorded gross revenue: ${money(data.metrics.gross_amount_minor,data.metrics.currency)}.`;
 const rows:any=await q`INSERT INTO executive_briefs (brief_date,period_start,period_end,metrics,written_brief,voice_script,source_snapshot,status,created_by,audio_status) VALUES (${w.brief_date},${w.period_start},${w.period_end},${metrics}::jsonb,${written},${data.voice.script},${snapshot}::jsonb,'FROZEN','Simon','SCRIPT_READY') ON CONFLICT (brief_date) DO UPDATE SET metrics=EXCLUDED.metrics,written_brief=EXCLUDED.written_brief,voice_script=EXCLUDED.voice_script,source_snapshot=EXCLUDED.source_snapshot,status='FROZEN',audio_status='SCRIPT_READY' RETURNING id,brief_date,status,audio_status`;
 return NextResponse.json({created_by:"Simon",...rows[0]});
}