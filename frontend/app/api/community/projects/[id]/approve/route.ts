import {NextResponse} from "next/server";
import {requireFounder} from "../../../../../../lib/auth";
import {ensureSchema,sql} from "../../../../../../lib/db";

export const runtime="nodejs";

export async function POST(_req:Request,{params}:{params:Promise<{id:string}>}){
  const founder=await requireFounder();
  if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
  await ensureSchema();
  const {id}=await params;
  const projectId=Number(id);
  if(!projectId)return NextResponse.json({error:"Invalid project"},{status:400});
  const q=sql();
  const rows:any=await q`
    UPDATE community_builder_projects
    SET status='APPROVED',approved_by='Kimberly Jimenez',approved_at=now(),updated_at=now()
    WHERE id=${projectId} AND status='DRAFT'
    RETURNING *
  `;
  if(!rows.length)return NextResponse.json({error:"Only draft blueprints can be approved."},{status:409});
  await q`INSERT INTO community_builder_actions(project_id,action_type,actor,detail)
    VALUES(${projectId},'BLUEPRINT_APPROVED','Kimberly Jimenez','Founder approved native community architecture for creation.')`;
  return NextResponse.json({project:rows[0]});
}
