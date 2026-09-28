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
