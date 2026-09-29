export type AgentLlmMessage={role:"system"|"user"|"assistant";content:string};

export async function generateAgentReply(messages:AgentLlmMessage[]){
  const omniBase=String(process.env.OMNIROUTE_BASE_URL||"").replace(/\/$/,"");
  const omniKey=process.env.OMNIROUTE_API_KEY;
  const openaiKey=process.env.OPENAI_API_KEY;
  const baseUrl=omniBase||"https://api.openai.com/v1";
  const apiKey=omniKey||openaiKey;
  const model=process.env.OMNIROUTE_MODEL||process.env.OPENAI_MODEL||process.env.LLM_MODEL;

  if(!apiKey||!model){
    return {
      ok:false as const,
      error:"LLM_NOT_CONFIGURED",
      detail:"Configure OMNIROUTE_API_KEY + OMNIROUTE_MODEL or OPENAI_API_KEY + OPENAI_MODEL.",
    };
  }

  const started=Date.now();
  const r=await fetch(baseUrl+"/chat/completions",{
    method:"POST",
    headers:{
      "Authorization":"Bearer "+apiKey,
      "Content-Type":"application/json",
    },
    body:JSON.stringify({
      model,
      messages,
      temperature:.65,
      max_tokens:700,
    }),
  });

  const data=await r.json().catch(()=>({}));
  if(!r.ok){
    return {
      ok:false as const,
      error:"LLM_REQUEST_FAILED",
      detail:String(data?.error?.message||data?.message||("HTTP "+r.status)).slice(0,500),
      duration_ms:Date.now()-started,
    };
  }

  const text=String(data?.choices?.[0]?.message?.content||"").trim();
  if(!text){
    return {
      ok:false as const,
      error:"LLM_EMPTY_RESPONSE",
      detail:"The configured model returned no assistant text.",
      duration_ms:Date.now()-started,
    };
  }

  return {
    ok:true as const,
    text,
    provider:omniBase?"OmniRoute":"OpenAI-compatible",
    model,
    duration_ms:Date.now()-started,
  };
}
