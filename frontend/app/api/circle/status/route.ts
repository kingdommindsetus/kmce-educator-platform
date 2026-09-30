import {NextResponse} from "next/server";
import {requireFounder} from "../../../lib/auth";

export async function GET(){
  const founder=await requireFounder();
  if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
  return NextResponse.json({
    provider:"Circle",
    admin_api_v2_configured:Boolean(process.env.CIRCLE_ADMIN_V2_TOKEN),
    community_url_configured:Boolean(process.env.CIRCLE_COMMUNITY_URL),
    provisioning_enabled:Boolean(process.env.CIRCLE_ADMIN_V2_TOKEN&&process.env.CIRCLE_COMMUNITY_URL),
    mode:"APPROVAL_GATED"
  });
}
