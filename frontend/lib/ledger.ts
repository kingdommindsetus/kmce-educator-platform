import {DEFAULT_ACCOUNTS,paymentReceiptEntries,verifyBalanced,entitlementDecision} from "./simon/ledger-delivery-v1";
import {getService} from "./simon/service-catalog";

export async function ensureLedgerAccounts(q:any){
 for(const a of DEFAULT_ACCOUNTS as any[]){
  await q`INSERT INTO ledger_accounts(code,name,account_type) VALUES(${a.code},${a.name},${a.account_type}) ON CONFLICT(code) DO UPDATE SET name=EXCLUDED.name,account_type=EXCLUDED.account_type,active=true`;
 }
}

export async function postJournal(q:any,input:any){
 const entries=input.entries||[]; const check:any=verifyBalanced(entries); if(!check.balanced)throw new Error("UNBALANCED_JOURNAL");
 await ensureLedgerAccounts(q);
 const existing:any=await q`SELECT id FROM ledger_journals WHERE source_provider=${input.source_provider} AND source_transaction_id=${input.source_transaction_id} AND journal_type=${input.journal_type} LIMIT 1`;
 if(existing.length)return {journal_id:Number(existing[0].id),duplicate:true};
 const rows:any=await q`INSERT INTO ledger_journals(source_provider,source_transaction_id,journal_type,description,currency,metadata) VALUES(${input.source_provider},${input.source_transaction_id},${input.journal_type},${input.description},${input.currency||"usd"},${JSON.stringify(input.metadata||{})}::jsonb) RETURNING id`;
 const journalId=Number(rows[0].id);
 for(const e of entries){
  await q`INSERT INTO ledger_entries(journal_id,account_code,direction,amount_minor,currency,metadata) VALUES(${journalId},${e.account_code},${e.direction},${Number(e.amount_minor)},${e.currency||input.currency||"usd"},${JSON.stringify(e.metadata||{})}::jsonb)`;
 }
 return {journal_id:journalId,duplicate:false};
}

export async function recordStripeReceipt(q:any,input:any){
 const entries=paymentReceiptEntries(input.amount_minor,input.currency||"usd");
 return postJournal(q,{source_provider:"stripe",source_transaction_id:input.transaction_id,journal_type:"PAYMENT_RECEIPT",description:"Stripe payment received; held as unearned revenue until fulfillment.",currency:input.currency||"usd",entries,metadata:input.metadata||{}});
}

export async function ensurePaidEntitlement(q:any,input:any){
 const serviceCode=String(input.service_code||"").toUpperCase(); const service:any=getService(serviceCode);
 if(!service)return {created:false,reason:"UNKNOWN_OR_MISSING_SERVICE_CODE"};
 const decision:any=entitlementDecision({transaction_status:input.transaction_status,service_code:serviceCode});
 if(!decision.grant)return {created:false,reason:decision.reason};
 const rows:any=await q`INSERT INTO entitlements(customer_email,service_code,source_provider,source_transaction_id,status,metadata,granted_at) VALUES(${input.customer_email||null},${serviceCode},${input.source_provider||"stripe"},${input.source_transaction_id},'ACTIVE',${JSON.stringify({...input.metadata,fulfillment_type:service.fulfillment_type})}::jsonb,now()) ON CONFLICT(source_provider,source_transaction_id,service_code) DO UPDATE SET status='ACTIVE',customer_email=COALESCE(EXCLUDED.customer_email,entitlements.customer_email),updated_at=now() RETURNING *`;
 const entitlement=rows[0];
 const courseCode=String(input.course_code||"").trim();
 if(courseCode && input.customer_email){
  await q`INSERT INTO learning_enrollments(entitlement_id,learner_email,course_code,status,metadata) VALUES(${entitlement.id},${String(input.customer_email).toLowerCase()},${courseCode},'ENROLLED',${JSON.stringify({source:"STRIPE_ENTITLEMENT"})}::jsonb) ON CONFLICT(learner_email,course_code,entitlement_id) DO NOTHING`;
 }
 return {created:true,entitlement};
}
