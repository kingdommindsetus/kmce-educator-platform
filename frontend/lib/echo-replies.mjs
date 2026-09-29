export function emailAddress(value=""){
  const s=String(value||"").trim();
  const angle=s.match(/<([^>]+)>/);
  return String(angle?.[1]||s).trim().toLowerCase();
}

export function stripQuotedReply(value=""){
  let text=String(value||"").replace(/\r\n/g,"\n").trim();
  const markers=[
    /\nOn .{0,240}wrote:\s*\n/i,
    /\nFrom:\s.+\nSent:\s.+\n/i,
    /\n-{2,}\s*Original Message\s*-{2,}\s*\n/i
  ];
  for(const re of markers){
    const m=text.match(re);
    if(m?.index!==undefined) text=text.slice(0,m.index).trim();
  }
  text=text.split("\n").filter(line=>!/^\s*>/.test(line)).join("\n").trim();
  return text;
}

export function classifyReply(value=""){
  const body=stripQuotedReply(value);
  const text=body.toLowerCase().replace(/\s+/g," ").trim();

  const negative=[
    /\bnot interested\b/,
    /\bno thanks\b/,
    /\bplease remove\b/,
    /\bremove me\b/,
    /\bunsubscribe\b/,
    /\bdo not contact\b/,
    /\bdon't contact\b/,
    /\bnot a fit\b/
  ];
  if(negative.some(re=>re.test(text))){
    return {classification:"NOT_INTERESTED",pipeline_stage:"DISQUALIFIED",assigned_agent:"Atlas",body};
  }

  const positive=[
    /\bi(?:'|’)m interested\b/,
    /\bwe(?:'|’)re interested\b/,
    /\binterested in\b/,
    /\blearn more\b/,
    /\btell me more\b/,
    /\bmore information\b/,
    /\bsend (?:me |us )?(?:info|information)\b/,
    /\b(?:schedule|book|set up) (?:a )?(?:call|meeting)\b/,
    /\bcan we (?:talk|speak|meet)\b/,
    /\bsounds good\b/,
    /^\s*yes[!.\s]*$/i
  ];
  if(positive.some(re=>re.test(text))){
    return {classification:"INTERESTED",pipeline_stage:"INTERESTED",assigned_agent:"Booker",body};
  }

  return {classification:"REPLIED",pipeline_stage:"REPLIED",assigned_agent:"Booker",body};
}

export function normalizeThreadMessages(providerResult){
  const candidates=[
    providerResult,
    providerResult?.data,
    providerResult?.data?.response_data,
    providerResult?.response_data,
    providerResult?.result,
    providerResult?.result?.data,
    providerResult?.result?.data?.response_data
  ].filter(Boolean);
  let messages=[];
  for(const x of candidates){
    if(Array.isArray(x?.messages)){messages=x.messages;break;}
  }
  return messages.map(m=>({
    messageId:String(m?.messageId||m?.id||""),
    threadId:String(m?.threadId||""),
    sender:String(m?.sender||header(m,"From")||""),
    recipient:String(m?.to||header(m,"To")||""),
    subject:String(m?.subject||m?.preview?.subject||header(m,"Subject")||""),
    body:String(m?.messageText||m?.text||m?.body||""),
    timestamp:String(m?.messageTimestamp||m?.internalDate||""),
    labelIds:Array.isArray(m?.labelIds)?m.labelIds.map(String):[]
  })).filter(m=>m.messageId);
}

function header(message,name){
  const hs=message?.payload?.headers;
  if(!Array.isArray(hs))return "";
  const h=hs.find(x=>String(x?.name||"").toLowerCase()===String(name).toLowerCase());
  return h?.value||"";
}

export function inboundMessages(messages,founderEmail,sentAt){
  const founder=emailAddress(founderEmail);
  const sentTime=sentAt?new Date(sentAt).getTime():0;
  return (messages||[]).filter(m=>{
    const sender=emailAddress(m.sender);
    const when=m.timestamp?new Date(m.timestamp).getTime():0;
    if(!sender || sender===founder)return false;
    if(m.labelIds?.includes("SENT"))return false;
    if(sentTime && when && when<sentTime)return false;
    return true;
  }).sort((a,b)=>new Date(a.timestamp||0).getTime()-new Date(b.timestamp||0).getTime());
}
