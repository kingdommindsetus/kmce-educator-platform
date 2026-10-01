import {ensureSchema,sql} from "./db";

export const PEGASUS_STATUSES=["PENDING","RUNNING","WAITING_APPROVAL","SUCCEEDED","FAILED","DEAD","CANCELLED"] as const;
export type PegasusStatus=typeof PEGASUS_STATUSES[number];

export function authorityFor(policy:string){
  return policy==="none"?"AUTO":"APPROVAL";
}

export async function createPegasusTask(input:{
  company_id?:string; capability:string; assigned_agent:string; objective:string;
  requested_by:string; approval_policy?:string; completion_contract?:unknown[];
  payload?:Record<string,unknown>; correlation_id?:string; idempotency_key:string;
}){
  await ensureSchema(); const q=sql();
  const policy=input.approval_policy||"none";
  const authority=authorityFor(policy);
  const rows:any=await q`
    INSERT INTO autonomy_jobs(
      idempotency_key,capability,owner_agent,authority,status,payload,created_by,
      company_id,objective,completion_contract,approval_policy,correlation_id
    ) VALUES(
      ${input.idempotency_key},${input.capability},${input.assigned_agent},${authority},
      ${policy==="none"?"PENDING":"WAITING_APPROVAL"},${JSON.stringify(input.payload||{})}::jsonb,${input.requested_by},
      ${input.company_id||"KMCE"},${input.objective},
      ${JSON.stringify(input.completion_contract||[])}::jsonb,${policy},${input.correlation_id||null}
    )
    ON CONFLICT(idempotency_key) DO UPDATE SET updated_at=now()
    RETURNING *
  `;
  const task=rows[0];
  await q`INSERT INTO pegasus_task_transitions(task_id,from_status,to_status,actor,reason)
           VALUES(${task.id},NULL,${task.status},${input.requested_by},'TASK_CREATED')`;
  await q`INSERT INTO autonomy_events(event_type,entity_type,entity_id,payload,source,correlation_id)
           VALUES('PEGASUS_TASK_CREATED','PEGASUS_TASK',${String(task.id)},${JSON.stringify({agent:input.assigned_agent,capability:input.capability})}::jsonb,'PEGASUS',${input.correlation_id||null})`;
  return task;
}

export async function getPegasusTask(id:number){
  await ensureSchema(); const q=sql();
  const rows:any=await q`SELECT * FROM autonomy_jobs WHERE id=${id} LIMIT 1`;
  if(!rows[0])return null;
  const evidence:any=await q`SELECT * FROM pegasus_task_evidence WHERE task_id=${id} ORDER BY created_at,id`;
  const transitions:any=await q`SELECT * FROM pegasus_task_transitions WHERE task_id=${id} ORDER BY created_at,id`;
  return {...rows[0],evidence_records:evidence,transitions};
}

export async function transitionPegasusTask(input:{
  id:number; to_status:PegasusStatus; actor:string; reason?:string;
  evidence?:Array<{evidence_type:string;label:string;value?:string;source_ref?:string;metadata?:Record<string,unknown>}>;
}){
  await ensureSchema(); const q=sql();
  const current:any=await q`SELECT * FROM autonomy_jobs WHERE id=${input.id} LIMIT 1`;
  if(!current[0])return {error:"Task not found",status:404} as const;
  const task=current[0];
  const evidence=input.evidence||[];
  for(const e of evidence){
    await q`INSERT INTO pegasus_task_evidence(task_id,evidence_type,label,value,source_ref,metadata,recorded_by)
      VALUES(${input.id},${e.evidence_type},${e.label},${e.value||null},${e.source_ref||null},${JSON.stringify(e.metadata||{})}::jsonb,${input.actor})`;
  }
  if(input.to_status==="SUCCEEDED"){
    const contract=Array.isArray(task.completion_contract)?task.completion_contract:[];
    const existing:any=await q`SELECT count(*)::int count FROM pegasus_task_evidence WHERE task_id=${input.id}`;
    if(contract.length>0 && Number(existing[0]?.count||0)===0)
      return {error:"Completion contract requires evidence before SUCCEEDED",status:409} as const;
    if(task.approval_policy!=="none" && !task.approved_at)
      return {error:"Task requires founder approval before SUCCEEDED",status:409} as const;
  }
  if(input.to_status==="RUNNING" && task.authority==="APPROVAL" && !task.approved_at)
    return {error:"Approval-gated task cannot run before approval",status:409} as const;
  const rows:any=await q`UPDATE autonomy_jobs SET status=${input.to_status},updated_at=now(),
    result=CASE WHEN ${input.to_status}='SUCCEEDED' THEN COALESCE(result,'{}'::jsonb) ELSE result END
    WHERE id=${input.id} RETURNING *`;
  await q`INSERT INTO pegasus_task_transitions(task_id,from_status,to_status,actor,reason)
    VALUES(${input.id},${task.status},${input.to_status},${input.actor},${input.reason||null})`;
  return {task:rows[0]} as const;
}

export async function approvePegasusTask(id:number,actor:string){
  await ensureSchema(); const q=sql();
  const rows:any=await q`UPDATE autonomy_jobs SET approved_by=${actor},approved_at=now(),
    status=CASE WHEN status='WAITING_APPROVAL' THEN 'PENDING' ELSE status END,updated_at=now()
    WHERE id=${id} RETURNING *`;
  if(!rows[0])return null;
  await q`INSERT INTO pegasus_task_transitions(task_id,from_status,to_status,actor,reason)
    VALUES(${id},'WAITING_APPROVAL',${rows[0].status},${actor},'FOUNDER_APPROVED')`;
  return rows[0];
}
