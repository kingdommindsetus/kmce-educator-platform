const API_BASE="https://api.printify.com/v1";

function headers(){
  const token=process.env.PRINTIFY_API_TOKEN;
  if(!token) throw new Error("PRINTIFY_API_TOKEN is not configured");
  return {"Authorization":`Bearer ${token}`,"Content-Type":"application/json"};
}

export function printifyReadiness(){
  return {
    token_configured:Boolean(process.env.PRINTIFY_API_TOKEN),
    shop_id_configured:Boolean(process.env.PRINTIFY_SHOP_ID),
    ready:Boolean(process.env.PRINTIFY_API_TOKEN && process.env.PRINTIFY_SHOP_ID)
  };
}

async function request(path:string,init:any={}){
  const res=await fetch(API_BASE+path,{...init,headers:{...headers(),...(init.headers||{})}});
  const text=await res.text();
  let body; try{body=text?JSON.parse(text):null}catch{body={raw:text}}
  if(!res.ok) throw new Error(`Printify ${res.status}: ${body?.message||body?.error||text||"request failed"}`);
  return body;
}

export async function listPrintifyShops(){
  return request("/shops.json",{method:"GET"});
}

export async function uploadPrintifyImage(input:any){
  if(!input?.file_name) throw new Error("file_name required");
  if(!input?.url && !input?.contents) throw new Error("url or contents required");
  return request("/uploads/images.json",{
    method:"POST",
    body:JSON.stringify({
      file_name:String(input.file_name),
      ...(input.url?{url:String(input.url)}:{}),
      ...(input.contents?{contents:String(input.contents)}:{})
    })
  });
}

export async function createPrintifyProduct(spec:any){
  const shopId=String(spec?.shop_id||process.env.PRINTIFY_SHOP_ID||"");
  if(!shopId) throw new Error("PRINTIFY_SHOP_ID is not configured");
  const required=["title","description","blueprint_id","print_provider_id","variants","print_areas"];
  for(const key of required) if(spec?.[key]===undefined||spec?.[key]===null) throw new Error(`${key} required`);
  return request(`/shops/${shopId}/products.json`,{
    method:"POST",
    body:JSON.stringify({
      title:spec.title,
      description:spec.description,
      blueprint_id:Number(spec.blueprint_id),
      print_provider_id:Number(spec.print_provider_id),
      variants:spec.variants,
      print_areas:spec.print_areas,
      tags:Array.isArray(spec.tags)?spec.tags:[]
    })
  });
}

export async function publishPrintifyProduct(productId:string,fields:any={}){
  const shopId=String(process.env.PRINTIFY_SHOP_ID||"");
  if(!shopId) throw new Error("PRINTIFY_SHOP_ID is not configured");
  if(!productId) throw new Error("productId required");
  const body={
    title:true,
    description:true,
    images:true,
    variants:true,
    tags:true,
    keyFeatures:true,
    shipping_template:true,
    ...fields
  };
  return request(`/shops/${shopId}/products/${productId}/publish.json`,{
    method:"POST",
    body:JSON.stringify(body)
  });
}
