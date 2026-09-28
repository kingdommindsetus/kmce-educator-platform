import {NextResponse} from "next/server";
import {requireFounder} from "../../../../lib/auth";
import {ensureSchema,sql} from "../../../../lib/db";
import {PROVIDERS,providerConfigured} from "../../../../lib/simon/provider-registry";
export const runtime="nodejs"; export const dynamic="force-dynamic";
export async function GET(){
 const founder=await requireFounder(); if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
 await ensureSchema(); const q=sql(); const rows:any[]=[];
 for(const p of PROVIDERS as any[]){
  const configured=providerConfigured(p,process.env);
  const baseUrl=p.base_url||(p.base_url_env?process.env[p.base_url_env]:null)||null;
  const status=configured?"CONFIGURED":"DISABLED";
  await q`INSERT INTO provider_registry(capability,provider_name,priority,status,base_url,credential_env,metadata) VALUES(${p.capability},${p.provider_name},${p.priority},${status},${baseUrl},${p.credential_env||null},${JSON.stringify({mode:p.mode,base_url_env:p.base_url_env||null})}::jsonb) ON CONFLICT(capability,provider_name) DO UPDATE SET priority=EXCLUDED.priority,status=EXCLUDED.status,base_url=EXCLUDED.base_url,credential_env=EXCLUDED.credential_env,metadata=EXCLUDED.metadata,updated_at=now()`;
  rows.push({capability:p.capability,provider_name:p.provider_name,priority:p.priority,status,configured,credential_env:p.credential_env||null,base_url_configured:Boolean(baseUrl)});
 }
 return NextResponse.json({providers:rows});
}
