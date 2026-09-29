import {NextResponse} from "next/server";
import {requireFounder} from "../../../../../lib/auth";
import {NERVS_AVATAR_PACK_V1} from "../../../../../lib/nervs-avatar-registry";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(){
  const founder=await requireFounder();
  if(!founder) return NextResponse.json({error:"Founder access required"},{status:403});

  const baseUrl=String(process.env.LIVETALKING_BASE_URL||"").replace(/\/$/,"");
  const configured=Boolean(baseUrl);

  return NextResponse.json({
    provider:"LiveTalking",
    model:"musetalk",
    configured,
    base_url_configured:configured,
    transport:"webrtc",
    fallback:"motion_loop",
    avatars:NERVS_AVATAR_PACK_V1.map(agent=>({
      agent_id:agent.id,
      agent_name:agent.name,
      avatar_id:agent.liveTalkingAvatarId,
      model:agent.liveTalkingModel,
      fallback_media_url:agent.mediaUrl,
    })),
  });
}
