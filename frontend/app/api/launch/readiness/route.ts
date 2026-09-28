import {NextResponse} from "next/server";
import {requireFounder} from "../../../../lib/auth";
import {ensureSchema,sql} from "../../../../lib/db";
import {PROVIDERS,providerConfigured} from "../../../../lib/simon/provider-registry";
export const runtime="nodejs"; export const dynamic="force-dynamic";

export async function GET(){
 const founder=await requireFounder(); if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
 await ensureSchema(); const q=sql(); const checks:any[]=[];
 const critical=["leads","lead_evidence","lead_qualification_runs","outreach_jobs","discovery_appointments","onboarding_cases","autonomy_jobs","autonomy_runs","ledger_journals","ledger_entries","entitlements","learning_enrollments","ce_completion_records","ce_certificates","growth_campaigns","content_assets","knowledge_documents","knowledge_edges","provider_registry"];
 const tables:any=await q`SELECT unnest(${critical}::text[]) AS name`;
 for(const t of tables){const r:any=await q`SELECT to_regclass(${String(t.name)}) AS reg`;checks.push({key:"table:"+t.name,status:r[0]?.reg?"READY":"BLOCKED",detail:r[0]?.reg?"present":"missing"});}
 const unbalanced:any=await q`SELECT j.id,COALESCE(sum(CASE WHEN e.direction='DEBIT' THEN e.amount_minor ELSE -e.amount_minor END),0)::bigint AS net FROM ledger_journals j LEFT JOIN ledger_entries e ON e.journal_id=j.id GROUP BY j.id HAVING COALESCE(sum(CASE WHEN e.direction='DEBIT' THEN e.amount_minor ELSE -e.amount_minor END),0)<>0 LIMIT 20`;
 checks.push({key:"ledger:balanced",status:unbalanced.length===0?"READY":"BLOCKED",detail:unbalanced.length===0?"all journals balanced":`${unbalanced.length} unbalanced journal(s)`});
 const dead:any=await q`SELECT count(*)::int AS count FROM autonomy_jobs WHERE status IN ('DEAD','FAILED')`;
 checks.push({key:"autonomy:dead_jobs",status:Number(dead[0]?.count||0)===0?"READY":"ATTENTION",detail:`${Number(dead[0]?.count||0)} dead/failed job(s)`});
 const approvals:any=await q`SELECT count(*)::int AS count FROM autonomy_jobs WHERE status='WAITING_APPROVAL'`;
 checks.push({key:"autonomy:waiting_approval",status:"INFO",detail:`${Number(approvals[0]?.count||0)} waiting approval`});
 const envFlags:any={
  AUTONOMY_WORKER_SECRET:Boolean(process.env.AUTONOMY_WORKER_SECRET),
  STRIPE_SECRET_KEY:Boolean(process.env.STRIPE_SECRET_KEY),
  STRIPE_WEBHOOK_SECRET:Boolean(process.env.STRIPE_WEBHOOK_SECRET),
  FIRECRAWL_API_KEY:Boolean(process.env.FIRECRAWL_API_KEY),
  OMNIROUTE_BASE_URL:Boolean(process.env.OMNIROUTE_BASE_URL),
  OMNIROUTE_API_KEY:Boolean(process.env.OMNIROUTE_API_KEY),
  GRAPHIFY_BASE_URL:Boolean(process.env.GRAPHIFY_BASE_URL),
  ECC_BASE_URL:Boolean(process.env.ECC_BASE_URL)
 };
 for(const [k,v] of Object.entries(envFlags))checks.push({key:"env:"+k,status:v?"READY":"CONFIG_REQUIRED",detail:v?"configured":"not configured"});
 const providerState=(PROVIDERS as any[]).map(p=>({capability:p.capability,provider_name:p.provider_name,configured:providerConfigured(p,process.env)}));
 const blocked=checks.filter(x=>x.status==="BLOCKED").length; const configRequired=checks.filter(x=>x.status==="CONFIG_REQUIRED").length; const attention=checks.filter(x=>x.status==="ATTENTION").length;
 return NextResponse.json({generated_at:new Date().toISOString(),overall:blocked?"BLOCKED":attention?"ATTENTION":configRequired?"CODE_READY_CONFIG_PENDING":"READY",summary:{blocked,attention,config_required:configRequired},checks,providers:providerState});
}
