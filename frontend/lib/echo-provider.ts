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


export async function fetchEchoThread(threadId:string,subject:string){
  const readiness=echoProviderReadiness();
  if(!readiness.apiKeyConfigured) throw new Error("COMPOSIO_API_KEY is not configured");
  if(!readiness.connectedAccountConfigured) throw new Error("COMPOSIO_GMAIL_CONNECTED_ACCOUNT_ID is not configured");
  if(!subject) throw new Error("Subject is required to fetch Gmail thread safely");

  const escaped=subject.replace(/"/g,"");
  const response=await fetch("https://backend.composio.dev/api/v3.1/tools/execute/GMAIL_FETCH_EMAILS",{
    method:"POST",
    headers:{
      "content-type":"application/json",
      "x-api-key":process.env.COMPOSIO_API_KEY!
    },
    body:JSON.stringify({
      connected_account_id:process.env.COMPOSIO_GMAIL_CONNECTED_ACCOUNT_ID!,
      user_id:"kmce-founder",
      version:"latest",
      arguments:{
        user_id:"me",
        query:`subject:"${escaped}"`,
        max_results:50,
        verbose:true,
        include_payload:true,
        include_spam_trash:false
      }
    })
  });

  const payload:any=await response.json().catch(()=>({}));
  if(!response.ok || payload?.successful===false){
    const detail=String(payload?.error||payload?.message||`Composio HTTP ${response.status}`).slice(0,500);
    throw new Error(detail);
  }
  return {result:payload,threadId};
}
