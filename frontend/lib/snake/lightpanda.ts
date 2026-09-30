type JsonRpcResponse={jsonrpc:"2.0";id:number;result?:unknown;error?:{code:number;message:string;data?:unknown}};

function endpoint(){
  const value=process.env.SNAKE_LIGHTPANDA_MCP_URL?.trim();
  if(!value) throw new Error("SNAKE_LIGHTPANDA_MCP_URL is not configured");
  return value;
}

async function rpc(method:string,params?:unknown,sessionId?:string){
  const id=Date.now();
  const res=await fetch(endpoint(),{
    method:"POST",
    headers:{
      "content-type":"application/json",
      ...(sessionId?{"Mcp-Session-Id":sessionId}:{})
    },
    body:JSON.stringify({jsonrpc:"2.0",id,method,params})
  });
  if(!res.ok) throw new Error(`Lightpanda MCP HTTP ${res.status}`);
  const body=await res.json() as JsonRpcResponse;
  if(body.error) throw new Error(`Lightpanda MCP ${body.error.code}: ${body.error.message}`);
  return {result:body.result,headers:res.headers};
}

export async function initializeLightpanda(){
  const first=await rpc("initialize",{
    protocolVersion:"2025-03-26",
    capabilities:{},
    clientInfo:{name:"kmce-snake",version:"1.0.0"}
  });
  const sessionId=first.headers.get("mcp-session-id")||undefined;
  await rpc("notifications/initialized",{},sessionId);
  return {sessionId,server:first.result};
}

export async function lightpandaTool(name:string,args:Record<string,unknown>,sessionId?:string){
  return rpc("tools/call",{name,arguments:args},sessionId);
}

export async function newSnakeBrowserSession(){
  const init=await initializeLightpanda();
  const created=await lightpandaTool("session_new",{name:"snake-verification"},init.sessionId);
  return {mcpSessionId:init.sessionId,browserSession:created.result};
}
