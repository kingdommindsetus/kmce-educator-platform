import {NextResponse} from "next/server";
import {requireFounder} from "../../../../lib/auth";
import {ensureSchema,sql,SCHEMA_VERSION} from "../../../../lib/db";

export async function GET(){
  const founder=await requireFounder();
  if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});

  try{
    await ensureSchema();
    const q=sql();
    const rows:any=await q`SELECT
      to_regclass('public.community_builder_projects') IS NOT NULL AS projects_ready,
      to_regclass('public.community_instances') IS NOT NULL AS communities_ready,
      to_regclass('public.community_spaces') IS NOT NULL AS spaces_ready,
      to_regclass('public.community_members') IS NOT NULL AS members_ready`;
    const checks=rows?.[0]||{};
    const storage_ready=Boolean(checks.projects_ready&&checks.communities_ready&&checks.spaces_ready&&checks.members_ready);

    return NextResponse.json({
      provider:"PEGASUS_NATIVE",
      engine:"Pegasus Community Engine",
      storage:"Neon PostgreSQL",
      schema_version:SCHEMA_VERSION,
      storage_ready,
      provisioning_enabled:storage_ready,
      external_platform_required:false,
      mode:"APPROVAL_GATED",
      checks
    });
  }catch(error:any){
    return NextResponse.json({
      provider:"PEGASUS_NATIVE",
      engine:"Pegasus Community Engine",
      storage:"Neon PostgreSQL",
      schema_version:SCHEMA_VERSION,
      storage_ready:false,
      provisioning_enabled:false,
      external_platform_required:false,
      mode:"DEGRADED",
      error:"Community storage migration failed",
      detail:String(error?.message||error)
    });
  }
}
