import {NextResponse} from "next/server";
import {requireFounder} from "../../../lib/auth";
import {ensureSchema,sql} from "../../../lib/db";
import {buildCommunityBlueprint} from "../../../lib/km-community-blueprint";

export const runtime="nodejs";

export async function GET(){
  const founder=await requireFounder();
  if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
  await ensureSchema();
  const q=sql();
  const rows:any=await q`
    SELECT p.*,e.public_name AS educator_name,c.slug AS community_slug,c.status AS community_status
    FROM community_builder_projects p
    LEFT JOIN educators e ON e.id=p.educator_id
    LEFT JOIN community_instances c ON c.id=p.community_instance_id
    ORDER BY p.updated_at DESC,p.id DESC
    LIMIT 50
  `;
  return NextResponse.json({projects:rows});
}

export async function POST(req:Request){
  const founder=await requireFounder();
  if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
  await ensureSchema();
  const body:any=await req.json().catch(()=>({}));
  const brief=String(body.brief||"").trim();
  const educatorId=body.educator_id?Number(body.educator_id):null;
  if(brief.length<12)return NextResponse.json({error:"Describe the community in a little more detail."},{status:400});
  const q=sql();
  let educatorName="";
  if(educatorId){
    const e:any=await q`SELECT public_name FROM educators WHERE id=${educatorId} LIMIT 1`;
    educatorName=e?.[0]?.public_name||"";
  }
  const blueprint=buildCommunityBlueprint(brief,educatorName);
  const projectName=String(body.project_name||blueprint.name||"KM Circle Community").trim();
  const rows:any=await q`
    INSERT INTO community_builder_projects(educator_id,project_name,brief,blueprint,status,metadata)
    VALUES(${educatorId},${projectName},${brief},${JSON.stringify(blueprint)}::jsonb,'DRAFT',${JSON.stringify({planner:"PEGASUS_COMMUNITY_BLUEPRINT_V1",engine:"PEGASUS_NATIVE"})}::jsonb)
    RETURNING *
  `;
  const project=rows[0];
  await q`INSERT INTO community_builder_actions(project_id,action_type,actor,detail,payload)
    VALUES(${project.id},'BLUEPRINT_CREATED','Pegasus','Native community blueprint generated from educator brief.',${JSON.stringify({tier_count:blueprint.tiers.length,space_count:blueprint.spaces.length})}::jsonb)`;
  return NextResponse.json({project},{status:201});
}
