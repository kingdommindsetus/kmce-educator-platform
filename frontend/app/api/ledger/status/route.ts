import {NextResponse} from "next/server";
import {requireFounder} from "../../../../lib/auth";
import {ensureSchema,sql} from "../../../../lib/db";
export const runtime="nodejs"; export const dynamic="force-dynamic";
export async function GET(){
 const founder=await requireFounder(); if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
 await ensureSchema(); const q=sql();
 const balances:any=await q`SELECT a.code,a.name,a.account_type,COALESCE(sum(CASE WHEN e.direction='DEBIT' THEN e.amount_minor ELSE -e.amount_minor END),0)::bigint AS net_minor FROM ledger_accounts a LEFT JOIN ledger_entries e ON e.account_code=a.code GROUP BY a.code,a.name,a.account_type ORDER BY a.code`;
 const journals:any=await q`SELECT * FROM ledger_journals ORDER BY posted_at DESC,id DESC LIMIT 50`;
 const entitlements:any=await q`SELECT * FROM entitlements ORDER BY created_at DESC LIMIT 50`;
 return NextResponse.json({balances,journals,entitlements});
}
