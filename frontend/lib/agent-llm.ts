export type AgentLlmMessage={role:"system"|"user"|"assistant";content:string};

type ProviderConfig={
  provider:"OpenJarvis"|"OmniRoute"|"OpenAI-compatible";
  baseUrl:string;
  apiKey:string;
  model:string;
};

function resolveProvider():ProviderConfig|null{
  const jarvisBase=String(process.env.OPENJARVIS_BASE_URL||"").replace(/\/$/,"");
  const jarvisKey=String(process.env.OPENJARVIS_API_KEY||"").trim();
  const jarvisModel=String(process.env.OPENJARVIS_MODEL||"").trim();
  if(jarvisBase&&jarvisModel){
    return {
      provider:"OpenJarvis",
      baseUrl:jarvisBase.endsWith("/v1")?jarvisBase:jarvisBase+"/v1",
      apiKey:jarvisKey,
      model:jarvisModel,
    };
  }

  const omniBase=String(process.env.OMNIROUTE_BASE_URL||"").replace(/\/$/,"");
  const omniKey=String(process.env.OMNIROUTE_API_KEY||"").trim();
  const omniModel=String(process.env.OMNIROUTE_MODEL||"").trim();
  if(omniBase&&omniKey&&omniModel){
    return {
      provider:"OmniRoute",
      baseUrl:omniBase,
      apiKey:omniKey,
      model:omniModel,
    };
  }

  const openaiKey=String(process.env.OPENAI_API_KEY||"").trim();
  const openaiModel=String(process.env.OPENAI_MODEL||process.env.LLM_MODEL||"").trim();
  if(openaiKey&&openaiModel){
    return {
      provider:"OpenAI-compatible",
      baseUrl:"https://api.openai.com/v1",
      apiKey:openaiKey,
      model:openaiModel,
    };
  }

  return null;
}

export async function generateAgentReply(messages:AgentLlmMessage[]){
  const provider=resolveProvider();

  if(!provider){
    return {
      ok:false as const,
      error:"LLM_NOT_CONFIGURED",
      detail:"Configure OpenJarvis (OPENJARVIS_BASE_URL + OPENJARVIS_MODEL), OmniRoute, or OpenAI.",
    };
  }

  const started=Date.now();
  const headers:Record<string,string>={"Content-Type":"application/json"};
  if(provider.apiKey) headers.Authorization="Bearer "+provider.apiKey;

  const r=await fetch(provider.baseUrl+"/chat/completions",{
    method:"POST",
    headers,
    body:JSON.stringify({
      model:provider.model,
      messages,
      temperature:.65,
      max_tokens:700,
    }),
    cache:"no-store",
  });

  const data=await r.json().catch(()=>({}));
  if(!r.ok){
    return {
      ok:false as const,
      error:"LLM_REQUEST_FAILED",
      detail:String(data?.error?.message||data?.detail||data?.message||("HTTP "+r.status)).slice(0,500),
      duration_ms:Date.now()-started,
      provider:provider.provider,
      model:provider.model,
    };
  }

  const text=String(data?.choices?.[0]?.message?.content||"").trim();
  if(!text){
    return {
      ok:false as const,
      error:"LLM_EMPTY_RESPONSE",
      detail:"The configured model returned no assistant text.",
      duration_ms:Date.now()-started,
      provider:provider.provider,
      model:provider.model,
    };
  }

  return {
    ok:true as const,
    text,
    provider:provider.provider,
    model:provider.model,
    duration_ms:Date.now()-started,
  };
}
