import { cookies, headers } from "next/headers";
import { ensureSchema, sql } from "./db";

export type KMCEUser={email:string;role:"FOUNDER_ADMIN"|"EDUCATOR"|"STUDENT";display_name:string|null};

const FOUNDER_EMAIL=(process.env.KMCE_FOUNDER_EMAIL||"").toLowerCase();

function authBase(){
  return process.env.NEON_AUTH_BASE_URL || process.env.VITE_NEON_AUTH_URL || "";
}

export async function currentUser():Promise<KMCEUser|null>{
  const base=authBase();
  if(!base) return null;
  const cookie=cookies().toString();
  const h=headers();
  const r=await fetch(base.replace(/\/$/,"")+"/api/auth/get-session",{
    headers:{cookie, "user-agent":h.get("user-agent")||""},
    cache:"no-store"
  }).catch(()=>null);
  if(!r||!r.ok) return null;
  const s:any=await r.json().catch(()=>null);
  const email=(s?.user?.email||"").toLowerCase();
  if(!email) return null;
  await ensureSchema();
  const q=sql();
  const role=email===FOUNDER_EMAIL?"FOUNDER_ADMIN":"STUDENT";
  const rows:any=await q`
    INSERT INTO app_users(email,display_name,role,last_login_at)
    VALUES(${email},${s?.user?.name||null},${role},now())
    ON CONFLICT(email) DO UPDATE SET
      display_name=COALESCE(EXCLUDED.display_name,app_users.display_name),
      last_login_at=now()
    RETURNING email,display_name,role
  `;
  return rows[0]||null;
}

export async function requireFounder(){
  const u=await currentUser();
  if(!u||u.role!=="FOUNDER_ADMIN") return null;
  return u;
}
