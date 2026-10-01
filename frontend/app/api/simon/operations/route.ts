import {NextResponse} from "next/server";
import {requireFounder} from "../../../../lib/auth";
import {ensureSchema,sql} from "../../../../lib/db";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(){
  const founder=await requireFounder();
  if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});

  await ensureSchema();
  const q=sql();

  const tasks:any=await q`
    SELECT
      id,
      owner_agent AS assigned_agent,
      objective AS title,
      objective AS instruction,
      status,
      'PEGASUS'::text AS source,
      created_by AS requested_by,
      capability,
      authority,
      approval_policy,
      approved_by,
      approved_at,
      correlation_id,
      parent_task_id,
      workflow_key,
      sequence_no,
      error_text,
      created_at,
      updated_at
    FROM autonomy_jobs
    WHERE status IN ('PENDING','RUNNING','WAITING_APPROVAL','FAILED')
    ORDER BY updated_at DESC
    LIMIT 100
  `;

  const actions:any=await q`
    SELECT id,action_type,target,payload,status,requested_by,created_at
    FROM simon_actions
    WHERE action_type IN ('ASK_SIMON','ESCALATE_KIMBERLY','DELEGATE','HANDLE')
    ORDER BY created_at DESC
    LIMIT 50
  `;

  const evidence:any=await q`
    SELECT e.id,e.task_id,e.evidence_type,e.label,e.value,e.source_ref,e.recorded_by,e.created_at
    FROM pegasus_task_evidence e
    ORDER BY e.created_at DESC
    LIMIT 50
  `;

  const byAgent:Record<string,number>={};
  const byStatus:Record<string,number>={};
  for(const task of tasks){
    byAgent[task.assigned_agent]=(byAgent[task.assigned_agent]||0)+1;
    byStatus[task.status]=(byStatus[task.status]||0)+1;
  }

  return NextResponse.json({
    system:"PEGASUS",
    generated_at:new Date().toISOString(),
    active_tasks:tasks,
    active_by_agent:byAgent,
    active_by_status:byStatus,
    waiting_approval:tasks.filter((x:any)=>x.status==="WAITING_APPROVAL"),
    failures:tasks.filter((x:any)=>x.status==="FAILED"),
    recent_evidence:evidence,
    workflows:Object.values(tasks.reduce((acc:any,t:any)=>{
      if(!t.workflow_key)return acc;
      const key=t.parent_task_id||t.id;
      if(!acc[key])acc[key]={parent_task_id:key,workflow_key:t.workflow_key,tasks:[]};
      acc[key].tasks.push(t);
      return acc;
    },{})),
    recent_actions:actions,
    needs_simon:actions.filter((x:any)=>x.action_type==="ASK_SIMON"&&x.status==="NEEDS_SIMON"),
    needs_kimberly:actions.filter((x:any)=>x.action_type==="ESCALATE_KIMBERLY"&&x.status==="REQUIRES_FOUNDER")
  });
}
