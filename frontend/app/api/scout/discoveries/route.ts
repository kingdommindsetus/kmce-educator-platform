import {NextResponse} from "next/server";
import {requireFounder} from "../../../../lib/auth";
import {ensureSchema,sql} from "../../../../lib/db";
import {normalizeCandidate} from "../../../../lib/simon/lead-intelligence";

export const runtime="nodejs";

export async function POST(req:Request){
  const founder=await requireFounder();
  if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
  await ensureSchema();
  const q=sql();
  const body:any=await req.json().catch(()=>({}));
  const educatorId=Number(body.educator_id||0);
  const candidates=Array.isArray(body.candidates)?body.candidates.slice(0,100):[];
  if(!educatorId||!candidates.length)return NextResponse.json({error:"educator_id and candidates are required"},{status:400});

  const created:any[]=[];
  const updated:any[]=[];
  const rejected:any[]=[];

  for(const raw of candidates){
    const c:any=normalizeCandidate(raw);
    if(!c.practice_name){rejected.push({reason:"practice_name required",raw});continue;}

    const existing:any=await q`
      SELECT id,practice_name,website_host FROM leads
      WHERE educator_id=${educatorId}
        AND (
          lower(practice_name)=lower(${c.practice_name})
          OR (${c.website_host}::text IS NOT NULL AND website_host=${c.website_host})
        )
      ORDER BY id
      LIMIT 1
    `;

    let leadId:number;
    if(existing.length){
      leadId=Number(existing[0].id);
      await q`
        UPDATE leads SET
          decision_maker=COALESCE(${c.decision_maker},decision_maker),
          city=COALESCE(${c.city},city),
          state=COALESCE(${c.state},state),
          email=COALESCE(${c.email},email),
          phone=COALESCE(${c.phone},phone),
          website=COALESCE(${c.website},website),
          website_host=COALESCE(${c.website_host},website_host),
          discovery_source=COALESCE(${c.discovery_source},discovery_source),
          contact_source_url=COALESCE(${c.source_url},contact_source_url),
          pipeline_stage='ENRICHING',
          assigned_agent='Claire',
          updated_at=now()
        WHERE id=${leadId}
      `;
      updated.push({id:leadId,practice_name:c.practice_name});
    }else{
      const rows:any=await q`
        INSERT INTO leads(
          educator_id,practice_name,decision_maker,city,state,email,phone,website,website_host,
          discovery_source,contact_source_url,pipeline_stage,assigned_agent,evidence,qualification_reason
        ) VALUES(
          ${educatorId},${c.practice_name},${c.decision_maker},${c.city},${c.state},${c.email},${c.phone},
          ${c.website},${c.website_host},${c.discovery_source},${c.source_url},'ENRICHING','Claire',
          ${c.source_url ? "Scout discovery: "+c.source_url : "Scout discovery imported"},
          'Awaiting Claire evidence verification'
        )
        RETURNING id
      `;
      leadId=Number(rows[0].id);
      created.push({id:leadId,practice_name:c.practice_name});
    }

    if(c.source_url){
      await q`
        INSERT INTO lead_evidence(lead_id,source_url,source_type,field_name,observed_value,confidence,discovered_by,metadata)
        VALUES(${leadId},${c.source_url},'PUBLIC_WEB','discovery',${c.practice_name},60,'Scout',${JSON.stringify({discovery_source:c.discovery_source})}::jsonb)
      `;
    }

    await q`INSERT INTO lead_activities(lead_id,actor_name,action,detail) VALUES(${leadId},'Scout','DISCOVERED',${"Scout discovered/imported lead and handed it to Claire. Source: "+(c.discovery_source||"unknown")})`;
    await q`INSERT INTO lead_activities(lead_id,actor_name,action,detail) VALUES(${leadId},'Claire','ENRICHMENT_QUEUED','Evidence verification and contact enrichment required before Atlas qualification.')`;
  }

  return NextResponse.json({
    accepted:created.length+updated.length,
    created,
    updated,
    rejected,
    next_agent:"Claire",
    external_actions_executed:false
  });
}
