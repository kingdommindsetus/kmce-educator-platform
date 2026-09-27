import { auth } from "./auth/server";
import { ensureSchema, sql } from "./db";
export type KMCEUser={email:string;role:"FOUNDER_ADMIN"|"EDUCATOR"|"STUDENT";display_name:string|null};
const FOUNDER_EMAIL=(process.env.KMCE_FOUNDER_EMAIL||"kingdommindsetus@gmail.com").trim().toLowerCase();
export async function currentUser():Promise<KMCEUser|null>{
  const result:any=await auth.getSession();
  const user=result?.data?.user||result?.user||null;
  const email=(user?.email||"").trim().toLowerCase();
  if(!email)return null;
  await ensureSchema();
  const q=sql();
  const bootstrapRole=email===FOUNDER_EMAIL?"FOUNDER_ADMIN":"STUDENT";
  const rows:any=await q`
    INSERT INTO app_users(email,display_name,role,last_login_at)
    VALUES(${email},${user?.name||null},${bootstrapRole},now())
    ON CONFLICT(email) DO UPDATE SET
      display_name=COALESCE(EXCLUDED.display_name,app_users.display_name),
      role=CASE WHEN app_users.email=${FOUNDER_EMAIL} THEN 'FOUNDER_ADMIN' ELSE app_users.role END,
      last_login_at=now(),updated_at=now()
    RETURNING email,display_name,role
  `;
  return rows[0]||null;
}
export async function requireFounder(){const u=await currentUser();return u?.role==="FOUNDER_ADMIN"?u:null;}
