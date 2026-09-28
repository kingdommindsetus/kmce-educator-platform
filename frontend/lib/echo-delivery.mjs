export function parseApprovedDraft(draft){
  const text=String(draft||"").replace(/\r\n/g,"\n");
  const lines=text.split("\n");
  const first=lines[0]||"";
  const subject=first.toLowerCase().startsWith("subject:")?first.slice(8).trim():"";
  const body=(subject?lines.slice(1):lines).join("\n").replace(/^\n+/,"").trim();
  if(!subject) return {ok:false,reason:"SUBJECT_REQUIRED"};
  if(!body) return {ok:false,reason:"BODY_REQUIRED"};
  return {ok:true,subject,body};
}

export function extractProviderIds(result){
  const candidates=[
    result,
    result?.data,
    result?.data?.response_data,
    result?.response_data,
    result?.result,
    result?.result?.data,
    result?.result?.data?.response_data
  ].filter(Boolean);
  for(const x of candidates){
    const id=x?.id||x?.message_id||x?.messageId;
    const threadId=x?.threadId||x?.thread_id||x?.threadID;
    if(id)return {messageId:String(id),threadId:threadId?String(threadId):null};
  }
  return {messageId:null,threadId:null};
}

export function wantsExternalSend(body,currentHash){
  return Boolean(body?.execute===true && body?.approved_sha256 && body.approved_sha256===currentHash);
}
