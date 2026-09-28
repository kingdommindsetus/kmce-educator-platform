export const DEFAULT_ACCOUNTS=Object.freeze([
  {code:"STRIPE_CLEARING",name:"Stripe Clearing",account_type:"ASSET"},
  {code:"UNEARNED_REVENUE",name:"Unearned Revenue",account_type:"LIABILITY"},
  {code:"SALES_REVENUE",name:"Sales Revenue",account_type:"REVENUE"},
  {code:"REFUNDS_EXPENSE",name:"Refunds / Credits",account_type:"EXPENSE"}
]);

export function paymentReceiptEntries(amountMinor,currency="usd"){
  const amount=Math.trunc(Number(amountMinor)||0); if(amount<=0)throw new Error("INVALID_AMOUNT");
  return [
    {account_code:"STRIPE_CLEARING",direction:"DEBIT",amount_minor:amount,currency},
    {account_code:"UNEARNED_REVENUE",direction:"CREDIT",amount_minor:amount,currency}
  ];
}

export function revenueRecognitionEntries(amountMinor,currency="usd"){
  const amount=Math.trunc(Number(amountMinor)||0); if(amount<=0)throw new Error("INVALID_AMOUNT");
  return [
    {account_code:"UNEARNED_REVENUE",direction:"DEBIT",amount_minor:amount,currency},
    {account_code:"SALES_REVENUE",direction:"CREDIT",amount_minor:amount,currency}
  ];
}

export function verifyBalanced(entries=[]){
  const debit=entries.filter(x=>x.direction==="DEBIT").reduce((n,x)=>n+Number(x.amount_minor||0),0);
  const credit=entries.filter(x=>x.direction==="CREDIT").reduce((n,x)=>n+Number(x.amount_minor||0),0);
  const currencies=[...new Set(entries.map(x=>String(x.currency||"usd").toLowerCase()))];
  return {balanced:entries.length>=2&&debit===credit&&currencies.length===1,debit,credit,currencies};
}

export function entitlementDecision(input={}){
  const status=String(input.transaction_status||"").toLowerCase();
  const service=String(input.service_code||"").toUpperCase();
  if(status!=="succeeded")return {grant:false,status:"PENDING",reason:"PAYMENT_NOT_SUCCEEDED"};
  if(!service)return {grant:false,status:"PENDING",reason:"SERVICE_CODE_REQUIRED"};
  return {grant:true,status:"ACTIVE",reason:"PAID_SERVICE"};
}

export function ceEligibility(input={}){
  const attendance=Boolean(input.attendance_verified);
  const assessment=Boolean(input.assessment_passed);
  const evaluation=Boolean(input.evaluation_completed);
  const hours=Number(input.ce_hours)||0;
  const eligible=attendance&&assessment&&evaluation&&hours>0;
  return {eligible,status:eligible?"ELIGIBLE":"PENDING",checks:{attendance,assessment,evaluation,hours_positive:hours>0}};
}
