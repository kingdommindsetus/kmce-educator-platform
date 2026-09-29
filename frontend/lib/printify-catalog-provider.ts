const API_BASE="https://api.printify.com/v1";

function authHeaders(){
  const token=process.env.PRINTIFY_API_TOKEN;
  if(!token) throw new Error("PRINTIFY_API_TOKEN is not configured");
  return {Authorization:`Bearer ${token}`,"Content-Type":"application/json"};
}

async function request(path:string){
  const res=await fetch(API_BASE+path,{method:"GET",headers:authHeaders()});
  const text=await res.text();
  let body:any=null;
  try{body=text?JSON.parse(text):null}catch{body={raw:text}}
  if(!res.ok) throw new Error(`Printify ${res.status}: ${body?.message||body?.error||text||"request failed"}`);
  return body;
}

export function printifyCatalogReadiness(){
  return {token_configured:Boolean(process.env.PRINTIFY_API_TOKEN)};
}

export async function listPrintifyBlueprints(){
  return request("/catalog/blueprints.json");
}

export function scoreBlueprintForStore(item:any){
  const title=String(item?.title||"").toLowerCase();
  let score=45;
  const strong=["hoodie","sweatshirt","crewneck","tee","t-shirt","shirt","mug","tumbler","candle","journal","notebook","tote","hat","cap","blanket","poster","canvas"];
  const medium=["bag","pillow","ornament","sticker","phone","case","sock","apron"];
  if(strong.some(k=>title.includes(k)))score+=30;
  else if(medium.some(k=>title.includes(k)))score+=15;
  if(String(item?.brand||"").trim())score+=5;
  if(Array.isArray(item?.images)&&item.images.length>0)score+=5;
  return Math.max(0,Math.min(100,score));
}
