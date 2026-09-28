import {NextResponse} from "next/server";
import {requireFounder} from "../../../../lib/auth";
import {ensureSchema,sql} from "../../../../lib/db";
import {qualifyLead} from "../../../../lib/simon/atlas-v1";

export const runtime="nodejs";

export async function POST(req:Request){
  const founder=await requireFounder();
  if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
  await ensureSchema();
  const q=sql();
  const body:any=await req.json().catch(()=>({}));
  const leadId=Number(body.lead_id||0);
  if(!leadId)return NextResponse.json({error:"lead_id required"},{status:400});

  const leads:any=await q`SELECT * FROM leads WHERE id=${leadId} LIMIT 1`;
  if(!leads.length)return NextResponse.json({error:"Lead not found"},{status:404});
  const lead=leads[0];

  const ev:any=await q`
    SELECT
      count(*)::int AS evidence_count,
      count(*) FILTER (WHERE upper(source_type)='OFFICIAL')::int AS official_evidence_count
    FROM lead_evidence WHERE lead_id=${leadId}
  `;
  const result:any=qualifyLead({
    ...lead,
    evidence_count:Number(ev[0]?.evidence_count||0),
    official_evidence_count:Number(ev[0]?.official_evidence_count||0)
  });

  const stage=result.decision==="QUALIFY"?"QUALIFIED":result.decision==="REJECT"?"DISQUALIFIED":"ENRICHED";
  const agent=result.decision==="QUALIFY"?"Maven":result.decision==="REJECT"?"Atlas":"Claire";

  await q`
    INSERT INTO lead_qualification_runs(
      lead_id,score,decision,score_breakdown,reasons,next_action,qualified_by
    ) VALUES(
      ${leadId},${result.score},${result.decision},
      ${JSON.stringify(result.breakdown)}::jsonb,
      ${JSON.stringify(result.reasons)}::jsonb,
      ${result.next_action},'Atlas'
    )
  `;

  await q`
    UPDATE leads SET
      qualification_score=${result.score},
      qualification_reason=${result.reasons.length?result.reasons.join("; "):"Atlas qualification threshold met."},
      pipeline_stage=${stage},
      assigned_agent=${agent},
      updated_at=now()
    WHERE id=${leadId}
  `;

  await q`
    INSERT INTO lead_activities(lead_id,actor_name,action,detail)
    VALUES(${leadId},'Atlas',${result.decision},${"Score "+result.score+". "+result.next_action})
  `;

  return NextResponse.json({
    lead_id:leadId,
    score:result.score,
    decision:result.decision,
    breakdown:result.breakdown,
    reasons:result.reasons,
    next_action:result.next_action,
    pipeline_stage:stage,
    assigned_agent:agent,
    external_actions_executed:false
  });
}
