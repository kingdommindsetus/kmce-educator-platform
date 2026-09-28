import {NextResponse} from "next/server";
import {requireFounder} from "../../../../lib/auth";
import {ensureSchema,sql} from "../../../../lib/db";
import {claireReadiness,normalizeUrl} from "../../../../lib/simon/lead-intelligence";

export const runtime="nodejs";

export async function POST(req:Request){
  const founder=await requireFounder();
  if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
  await ensureSchema();
  const q=sql();
  const body:any=await req.json().catch(()=>({}));
  const leadId=Number(body.lead_id||0);
  if(!leadId)return NextResponse.json({error:"lead_id required"},{status:400});

  const rows:any=await q`SELECT * FROM leads WHERE id=${leadId} LIMIT 1`;
  if(!rows.length)return NextResponse.json({error:"Lead not found"},{status:404});
  const lead=rows[0];

  const evidence=Array.isArray(body.evidence)?body.evidence.slice(0,50):[];
  for(const item of evidence){
    const sourceUrl=normalizeUrl(item.source_url);
    if(!sourceUrl)continue;
    const confidence=Math.max(0,Math.min(100,Number(item.confidence)||50));
    await q`
      INSERT INTO lead_evidence(
        lead_id,source_url,source_type,field_name,observed_value,confidence,
        discovered_by,verified_by,verified_at,metadata
      ) VALUES(
        ${leadId},${sourceUrl},${String(item.source_type||"PUBLIC_WEB").toUpperCase()},
        ${String(item.field_name||"research")},${item.observed_value==null?null:String(item.observed_value)},
        ${confidence},'Claire','Claire',now(),${JSON.stringify(item.metadata||{})}::jsonb
      )
    `;
  }

  await q`
    UPDATE leads SET
      decision_maker=COALESCE(${body.decision_maker||null},decision_maker),
      email=COALESCE(${body.email ? String(body.email).toLowerCase() : null},email),
      phone=COALESCE(${body.phone||null},phone),
      website=COALESCE(${body.website ? normalizeUrl(body.website) : null},website),
      contact_source_url=COALESCE(${body.contact_source_url ? normalizeUrl(body.contact_source_url) : null},contact_source_url),
      contact_verified_at=CASE WHEN ${Boolean(body.contact_verified)} THEN now() ELSE contact_verified_at END,
      last_researched_at=now(),
      updated_at=now()
    WHERE id=${leadId}
  `;

  const refreshed:any=await q`SELECT * FROM leads WHERE id=${leadId} LIMIT 1`;
  const allEvidence:any=await q`
    SELECT source_url,source_type,field_name,observed_value,confidence
    FROM lead_evidence WHERE lead_id=${leadId}
    ORDER BY created_at ASC
  `;

  const readiness:any=claireReadiness(refreshed[0],allEvidence);
  const nextStage=readiness.ready_for_atlas?"ENRICHED":"ENRICHING";
  const nextAgent=readiness.ready_for_atlas?"Atlas":"Claire";

  await q`
    UPDATE leads SET
      research_confidence=${readiness.confidence},
      pipeline_stage=${nextStage},
      assigned_agent=${nextAgent},
      qualification_reason=${readiness.ready_for_atlas
        ? "Claire enrichment complete; ready for Atlas qualification."
        : "Claire enrichment incomplete; more verified evidence/contact data required."},
      updated_at=now()
    WHERE id=${leadId}
  `;

  await q`
    INSERT INTO lead_activities(lead_id,actor_name,action,detail)
    VALUES(
      ${leadId},'Claire',
      ${readiness.ready_for_atlas ? "ENRICHED" : "ENRICHMENT_UPDATED"},
      ${readiness.ready_for_atlas
        ? "Evidence threshold met. Lead handed to Atlas."
        : "Evidence updated. Claire retains ownership until readiness threshold is met."}
    )
  `;

  return NextResponse.json({
    lead_id:leadId,
    stage:nextStage,
    assigned_agent:nextAgent,
    readiness,
    evidence_count:allEvidence.length,
    external_actions_executed:false
  });
}
