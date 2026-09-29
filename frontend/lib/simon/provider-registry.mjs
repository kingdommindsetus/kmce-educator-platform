export const PROVIDERS=Object.freeze([
  {capability:"knowledge.search",provider_name:"Neon Knowledge",priority:10,base_url:null,credential_env:null,mode:"INTERNAL"},
  {capability:"knowledge.sync",provider_name:"Obsidian Bridge",priority:10,base_url:null,credential_env:null,mode:"FOUNDER_SYNC"},
  {capability:"relationship.search",provider_name:"Neon Knowledge Edges",priority:10,base_url:null,credential_env:null,mode:"INTERNAL"},
  {capability:"relationship.enrich",provider_name:"Graphify",priority:20,base_url_env:"GRAPHIFY_BASE_URL",credential_env:null,mode:"EXTERNAL"},
  {capability:"web.search",provider_name:"Firecrawl",priority:10,base_url:"https://api.firecrawl.dev/v2",credential_env:"FIRECRAWL_API_KEY",mode:"EXTERNAL"},
  {capability:"website.inspect",provider_name:"Firecrawl",priority:10,base_url:"https://api.firecrawl.dev/v2",credential_env:"FIRECRAWL_API_KEY",mode:"EXTERNAL"},
  {capability:"llm.generate",provider_name:"OmniRoute",priority:10,base_url_env:"OMNIROUTE_BASE_URL",credential_env:"OMNIROUTE_API_KEY",mode:"EXTERNAL"},
  {capability:"procedure.lookup",provider_name:"ECC",priority:10,base_url_env:"ECC_BASE_URL",credential_env:null,mode:"EXTERNAL_OR_SYNC"},
  {capability:"avatar.render.realtime",provider_name:"LiveTalking",priority:10,base_url_env:"LIVETALKING_BASE_URL",credential_env:null,mode:"EXTERNAL"}
]);

export function providerConfigured(provider,env={}){
  if(provider.mode==="INTERNAL"||provider.mode==="FOUNDER_SYNC")return true;
  if(provider.base_url_env&&!env[provider.base_url_env])return false;
  if(provider.credential_env&&!env[provider.credential_env])return false;
  return Boolean(provider.base_url||provider.base_url_env);
}
