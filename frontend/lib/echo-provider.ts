import {Composio} from "@composio/core";

export type EchoEmail={recipient:string;subject:string;body:string};

export function echoProviderReadiness(){
  return {
    apiKeyConfigured:Boolean(process.env.COMPOSIO_API_KEY),
    connectedAccountConfigured:Boolean(process.env.COMPOSIO_GMAIL_CONNECTED_ACCOUNT_ID),
    deliveryEnabled:process.env.ECHO_PROVIDER_ENABLED==="true"
  };
}

export async function sendWithEcho(message:EchoEmail){
  const readiness=echoProviderReadiness();
  if(!readiness.apiKeyConfigured) throw new Error("COMPOSIO_API_KEY is not configured");
  if(!readiness.connectedAccountConfigured) throw new Error("COMPOSIO_GMAIL_CONNECTED_ACCOUNT_ID is not configured");
  if(!readiness.deliveryEnabled) throw new Error("Echo external delivery is disabled");

  const composio=new Composio({apiKey:process.env.COMPOSIO_API_KEY!});
  return composio.tools.execute("GMAIL_SEND_EMAIL",{
    userId:"kmce-founder",
    connectedAccountId:process.env.COMPOSIO_GMAIL_CONNECTED_ACCOUNT_ID!,
    arguments:{
      recipient_email:message.recipient,
      subject:message.subject,
      body:message.body,
      is_html:false,
      user_id:"me"
    },
    dangerouslySkipVersionCheck:true
  });
}


export async function fetchEchoThread(threadId:string,_subject:string){
  const readiness=echoProviderReadiness();
  if(!readiness.apiKeyConfigured) throw new Error("COMPOSIO_API_KEY is not configured");
  if(!readiness.connectedAccountConfigured) throw new Error("COMPOSIO_GMAIL_CONNECTED_ACCOUNT_ID is not configured");
  if(!threadId) throw new Error("Gmail thread id is required");

  const endpoint=`https://gmail.googleapis.com/gmail/v1/users/me/threads/${encodeURIComponent(threadId)}?format=full`;
  const response=await fetch("https://backend.composio.dev/api/v3.1/tools/execute/proxy",{
    method:"POST",
    headers:{
      "content-type":"application/json",
      "x-api-key":process.env.COMPOSIO_API_KEY!
    },
    body:JSON.stringify({
      connected_account_id:process.env.COMPOSIO_GMAIL_CONNECTED_ACCOUNT_ID!,
      endpoint,
      method:"GET"
    })
  });

  const payload:any=await response.json().catch(()=>({}));
  if(!response.ok || payload?.status>=400){
    const raw=payload?.error??payload?.message??payload?.data??`Composio HTTP ${response.status}`;
    const detail=typeof raw==="string"?raw:JSON.stringify(raw);
    throw new Error(detail.slice(0,500));
  }
  return {result:payload?.data??payload,threadId};
}
