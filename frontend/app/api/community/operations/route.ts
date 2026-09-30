import {NextResponse} from "next/server";
import {requireFounder} from "../../../../lib/auth";
import {ensureSchema,sql} from "../../../../lib/db";

export const runtime="nodejs";

export async function GET(){
  const founder=await requireFounder();
  if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
  await ensureSchema();
  const q=sql();

  const rows:any=await q`
    SELECT
      p.id AS project_id,
      p.project_name,
      p.status AS project_status,
      p.updated_at,
      e.public_name AS educator_name,
      c.id AS community_id,
      c.name AS community_name,
      c.slug,
      c.status AS community_status,
      COALESCE((SELECT count(*)::int FROM community_tiers t WHERE t.community_id=c.id AND t.active=true),0) AS tier_count,
      COALESCE((SELECT count(*)::int FROM community_spaces s WHERE s.community_id=c.id AND s.active=true),0) AS space_count,
      COALESCE((SELECT count(*)::int FROM community_members m WHERE m.community_id=c.id AND m.status='ACTIVE'),0) AS member_count,
      COALESCE((SELECT count(*)::int FROM community_lessons l JOIN community_course_sections cs ON cs.id=l.section_id WHERE cs.community_id=c.id AND l.status='DRAFT'),0) AS draft_lessons,
      (SELECT min(ev.starts_at) FROM community_events ev WHERE ev.community_id=c.id AND ev.status='SCHEDULED' AND ev.starts_at>=now()) AS next_event_at,
      COALESCE((SELECT count(*)::int FROM agent_tasks at WHERE at.assigned_agent='Marie' AND at.source='PEGASUS_COMMUNITY' AND at.status IN ('QUEUED','IN_PROGRESS') AND (at.title ILIKE '%'||COALESCE(c.name,p.project_name)||'%' OR at.instruction ILIKE '%'||COALESCE(c.name,p.project_name)||'%')),0) AS marie_open_tasks
    FROM community_builder_projects p
    LEFT JOIN educators e ON e.id=p.educator_id
    LEFT JOIN community_instances c ON c.id=p.community_instance_id
    ORDER BY p.updated_at DESC,p.id DESC
    LIMIT 100
  `;

  const communities=rows.map((row:any)=>{
    let stage="BLUEPRINT";
    let blocker="";
    let next_action="Marie: review blueprint completeness";
    let health="BUILDING";

    if(row.project_status==="DRAFT"){
      stage="APPROVAL";
      blocker="Founder approval required";
      next_action="Kimberly: approve community blueprint";
      health="WAITING";
    }else if(row.project_status==="APPROVED"&&!row.community_id){
      stage="BUILDING";
      next_action="Marie: trigger native community build";
      health="READY";
    }else if(row.community_id){
      if(Number(row.draft_lessons)>0){
        stage="CONTENT_SETUP";
        blocker=Number(row.draft_lessons)+" draft lesson"+(Number(row.draft_lessons)===1?"":"s");
        next_action="Marie: route curriculum completion";
        health="NEEDS_ATTENTION";
      }else if(Number(row.member_count)===0){
        stage="MEMBER_SETUP";
        blocker="No active members yet";
        next_action="Marie: prepare member onboarding";
        health="NEEDS_ATTENTION";
      }else if(!row.next_event_at){
        stage="LAUNCH_READY";
        next_action="Marie: schedule first member event or activation";
        health="READY";
      }else{
        stage="LIVE";
        next_action="Marie: monitor engagement, events and member support";
        health="HEALTHY";
      }
    }

    return {...row,stage,blocker,next_action,health,assigned_agent:"Marie"};
  });

  const summary={
    total:communities.length,
    live:communities.filter((x:any)=>x.community_id).length,
    needs_attention:communities.filter((x:any)=>x.health==="NEEDS_ATTENTION"||x.health==="WAITING").length,
    members:communities.reduce((n:number,x:any)=>n+Number(x.member_count||0),0),
    marie_open_tasks:communities.reduce((n:number,x:any)=>n+Number(x.marie_open_tasks||0),0),
  };

  return NextResponse.json({generated_at:new Date().toISOString(),owner:"Marie",summary,communities});
}
