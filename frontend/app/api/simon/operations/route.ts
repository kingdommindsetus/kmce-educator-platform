import {NextResponse} from "next/server";
import {requireFounder} from "../../../../lib/auth";
import {ensureSchema,sql} from "../../../../lib/db";

export const runtime="nodejs";

export async function GET(){
  const founder=await requireFounder();
  if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
  await ensureSchema();
  const q=sql();

  const tasks:any=await q`
    SELECT id,assigned_agent,title,instruction,status,source,requested_by,created_at,updated_at
    FROM agent_tasks
    WHERE status IN ('QUEUED','IN_PROGRESS')
    ORDER BY created_at DESC
    LIMIT 100
  `;

  const actions:any=await q`
    SELECT id,action_type,target,payload,status,requested_by,created_at
    FROM simon_actions
    WHERE action_type IN ('ASK_SIMON','ESCALATE_KIMBERLY','DELEGATE','HANDLE')
    ORDER BY created_at DESC
    LIMIT 50
  `;

  const byAgent:Record<string,number>={};
  for(const task of tasks)byAgent[task.assigned_agent]=(byAgent[task.assigned_agent]||0)+1;

  return NextResponse.json({
    generated_at:new Date().toISOString(),
    active_tasks:tasks,
    active_by_agent:byAgent,
    recent_actions:actions,
    needs_simon:actions.filter((x:any)=>x.action_type==="ASK_SIMON"&&x.status==="NEEDS_SIMON"),
    needs_kimberly:actions.filter((x:any)=>x.action_type==="ESCALATE_KIMBERLY"&&x.status==="REQUIRES_FOUNDER")
  });
}
