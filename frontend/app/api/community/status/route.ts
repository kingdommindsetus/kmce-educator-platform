import {NextResponse} from "next/server";
import {requireFounder} from "../../../lib/auth";

export async function GET(){
  const founder=await requireFounder();
  if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
  return NextResponse.json({
    provider:"PEGASUS_NATIVE",
    engine:"Pegasus Community Engine",
    storage:"Neon PostgreSQL",
    provisioning_enabled:true,
    external_platform_required:false,
    mode:"APPROVAL_GATED"
  });
}
