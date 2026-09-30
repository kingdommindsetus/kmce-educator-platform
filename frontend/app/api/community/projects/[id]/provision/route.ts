import {NextResponse} from "next/server";
import {requireFounder} from "../../../../../../lib/auth";
import {ensureSchema,sql} from "../../../../../../lib/db";

export const runtime="nodejs";

function slugify(value:string){
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,70)||"community";
}

export async function POST(_req:Request,{params}:{params:Promise<{id:string}>}){
  const founder=await requireFounder();
  if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
  await ensureSchema();
  const {id}=await params;
  const projectId=Number(id);
  if(!projectId)return NextResponse.json({error:"Invalid project"},{status:400});
  const q=sql();

  const rows:any=await q`SELECT * FROM community_builder_projects WHERE id=${projectId} LIMIT 1`;
  const project=rows[0];
  if(!project)return NextResponse.json({error:"Community blueprint not found"},{status:404});
  if(project.status==="DRAFT")return NextResponse.json({error:"Founder approval is required before building the community."},{status:409});

  const bp:any=project.blueprint||{};
  const baseSlug=slugify(bp.name||project.project_name||"community");
  const communityRows:any=await q`
    INSERT INTO community_instances(project_id,educator_id,name,slug,description,status,created_by,metadata)
    VALUES(${projectId},${project.educator_id||null},${String(bp.name||project.project_name)},${baseSlug+"-"+projectId},${String(bp.summary||"")},'LIVE','Pegasus',${JSON.stringify({source:"COMMUNITY_BLUEPRINT",project_id:projectId})}::jsonb)
    ON CONFLICT(project_id) DO UPDATE SET
      name=EXCLUDED.name,description=EXCLUDED.description,status='LIVE',updated_at=now()
    RETURNING *
  `;
  const community=communityRows[0];
  const communityId=Number(community.id);

  const tierIds:Record<string,number>={};
  for(let i=0;i<(bp.tiers||[]).length;i++){
    const tier=bp.tiers[i];
    const price=tier.price_monthly==null?null:Math.round(Number(tier.price_monthly)*100);
    const tr:any=await q`
      INSERT INTO community_tiers(community_id,name,price_minor,access_key,promise,position,metadata)
      VALUES(${communityId},${String(tier.name)},${price},${String(tier.access_group||tier.name)},${String(tier.promise||"")},${i},${JSON.stringify({source:"BLUEPRINT"})}::jsonb)
      ON CONFLICT(community_id,name) DO UPDATE SET price_minor=EXCLUDED.price_minor,access_key=EXCLUDED.access_key,promise=EXCLUDED.promise,position=EXCLUDED.position,updated_at=now()
      RETURNING id
    `;
    tierIds[String(tier.name)]=Number(tr[0].id);
  }

  const spaceIds:Record<string,number>={};
  for(let i=0;i<(bp.spaces||[]).length;i++){
    const space=bp.spaces[i];
    const sr:any=await q`
      INSERT INTO community_spaces(community_id,name,slug,space_type,visibility,position,metadata)
      VALUES(${communityId},${String(space.name)},${slugify(String(space.name))},${String(space.type||"discussion")},${String(space.visibility||"All members")},${i},${JSON.stringify({source:"BLUEPRINT"})}::jsonb)
      ON CONFLICT(community_id,name) DO UPDATE SET space_type=EXCLUDED.space_type,visibility=EXCLUDED.visibility,position=EXCLUDED.position,updated_at=now()
      RETURNING id
    `;
    spaceIds[String(space.name)]=Number(sr[0].id);
  }

  for(const tier of bp.tiers||[]){
    const tierId=tierIds[String(tier.name)];
    if(!tierId)continue;
    for(const spaceName of tier.spaces||[]){
      const spaceId=spaceIds[String(spaceName)];
      if(!spaceId)continue;
      await q`INSERT INTO community_access_grants(community_id,tier_id,space_id)
        VALUES(${communityId},${tierId},${spaceId})
        ON CONFLICT(community_id,tier_id,space_id) DO NOTHING`;
    }
  }

  let lessonCount=0;
  for(let i=0;i<(bp.course_outline||[]).length;i++){
    const section=bp.course_outline[i];
    const sec:any=await q`
      INSERT INTO community_course_sections(community_id,title,position,status)
      VALUES(${communityId},${String(section.section)},${i},'DRAFT')
      ON CONFLICT(community_id,title) DO UPDATE SET position=EXCLUDED.position,updated_at=now()
      RETURNING id
    `;
    const sectionId=Number(sec[0].id);
    for(let j=0;j<(section.lessons||[]).length;j++){
      await q`
        INSERT INTO community_lessons(section_id,title,position,status)
        VALUES(${sectionId},${String(section.lessons[j])},${j},'DRAFT')
        ON CONFLICT(section_id,title) DO UPDATE SET position=EXCLUDED.position,updated_at=now()
      `;
      lessonCount++;
    }
  }

  const updated:any=await q`
    UPDATE community_builder_projects
    SET status='LIVE',community_instance_id=${communityId},provisioned_at=COALESCE(provisioned_at,now()),updated_at=now(),last_error=NULL
    WHERE id=${projectId}
    RETURNING *
  `;
  await q`INSERT INTO community_builder_actions(project_id,action_type,actor,detail,payload)
    VALUES(${projectId},'COMMUNITY_CREATED','Pegasus','Native Pegasus community created from approved blueprint.',${JSON.stringify({community_id:communityId,tiers:Object.keys(tierIds).length,spaces:Object.keys(spaceIds).length,lessons:lessonCount})}::jsonb)`;

  return NextResponse.json({project:updated[0],community,summary:{tiers:Object.keys(tierIds).length,spaces:Object.keys(spaceIds).length,lessons:lessonCount}});
}
