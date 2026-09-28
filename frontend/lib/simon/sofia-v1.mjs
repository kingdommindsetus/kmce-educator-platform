const SUPPORTED_CHANNELS=["linkedin","facebook","instagram","youtube","google_business"];

export function normalizeChannels(channels=[]){
  return [...new Set((channels||[]).map(x=>String(x).toLowerCase().trim()).filter(x=>SUPPORTED_CHANNELS.includes(x)))];
}

export function buildGrowthPlan(input={}){
  const objective=String(input.objective||"").trim();
  const audience=String(input.audience||"").trim();
  const service=String(input.service_name||input.service_code||"KMCE education").trim();
  const channels=normalizeChannels(input.channels);
  if(!objective)return {ok:false,reason:"OBJECTIVE_REQUIRED"};
  if(!channels.length)return {ok:false,reason:"SUPPORTED_CHANNEL_REQUIRED"};
  const assets=[];
  for(const channel of channels){
    let title=`${service}: ${objective}`;
    let body=`Kingdom Mindset CE helps dental professionals move from education to implementation. ${objective}.`;
    if(audience)body+=` Intended audience: ${audience}.`;
    if(channel==="linkedin")body+=" Focus: professional education, implementation, and measurable practice workflow.";
    if(channel==="instagram"||channel==="facebook")body+=" Focus: concise educational value, team transformation, and a clear next step.";
    if(channel==="youtube")body+=" Format: educational video outline with one primary teaching point and one call to action.";
    if(channel==="google_business")body+=" Format: concise business update tied to an active KMCE educational offering.";
    assets.push({channel,asset_type:channel==="youtube"?"VIDEO_BRIEF":"SOCIAL_DRAFT",title,body,status:"DRAFT"});
  }
  return {ok:true,objective,audience:audience||null,channels,assets};
}

export function campaignAttention(input={}){
  const status=String(input.status||""); const draftCount=Number(input.draft_count||0); const approved=Number(input.approved_count||0);
  if(status!=="ACTIVE")return {needs_attention:false,reason:"NOT_ACTIVE"};
  if(draftCount===0&&approved===0)return {needs_attention:true,reason:"NO_CONTENT"};
  if(draftCount>0&&approved===0)return {needs_attention:true,reason:"CONTENT_AWAITING_REVIEW"};
  return {needs_attention:false,reason:"HEALTHY"};
}
