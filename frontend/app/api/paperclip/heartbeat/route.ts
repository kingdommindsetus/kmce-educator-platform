import {NextResponse} from "next/server";
import {ensureSchema,sql} from "../../../../lib/db";

export const runtime="nodejs";

const AGENT_BY_KEY:Record<string,string>={
  simon:"Simon",marie:"Marie",eyes:"Eyes",mark:"Mark",cammy:"Cammy",eve:"Evan",
  tube:"Tube",lucy:"Lucy",snake:"Snake",alice:"Alice",echo:"Echo",booker:"Booker"
};

function authorized(req:Request){
  const secret=process.env.PAPERCLIP_BRIDGE_SECRET;
  if(!secret)return false;
  return (req.headers.get("authorization")||"")===`Bearer ${secret}`;
}

export async function POST(req:Request){
  if(!authorized(req))return NextResponse.json({error:"Unauthorized"},{status:403});
  const body:any=await req.json().catch(()=>null);
  if(!body?.agentId)return NextResponse.json({error:"agentId is required"},{status:400});

  const raw=String(body.agentKey||body.agentId||"").trim();
  const key=raw.toLowerCase();
  const assigned=AGENT_BY_KEY[key]||Object.values(AGENT_BY_KEY).find(x=>x.toLowerCase()===key);
  if(!assigned)return NextResponse.json({error:"Unknown KMCE agent",agentId:body.agentId},{status:400});

  const context=body.context||{};
  const taskId=String(context.taskId||context.issueId||body.runId||"unassigned");
  const title=String(context.title||`Paperclip assignment · ${taskId}`).slice(0,240);
  const instruction=String(
    context.instruction||
    context.description||
    `Paperclip heartbeat received for ${assigned}. Review Paperclip task ${taskId}, execute only within current KMCE authority, and keep external sends, publishing, payments, CE authorization, and destructive actions approval-gated.`
  );

  await ensureSchema();
  const q=sql();
  const existing:any=await q`SELECT id,status FROM agent_tasks
    WHERE assigned_agent=${assigned} AND source='PAPERCLIP' AND title=${title}
      AND status IN ('QUEUED','IN_PROGRESS')
    ORDER BY id DESC LIMIT 1`;

  let task:any;
  let deduped=false;
  if(existing.length){task=existing[0];deduped=true;}
  else{
    const rows:any=await q`INSERT INTO agent_tasks(assigned_agent,title,instruction,source,requested_by)
      VALUES(${assigned},${title},${instruction},'PAPERCLIP','Paperclip')
      RETURNING id,status`;
    task=rows[0];
  }

  await q`INSERT INTO autonomy_events(event_type,entity_type,entity_id,payload,source,correlation_id)
    VALUES('PAPERCLIP_HEARTBEAT','agent_task',${String(task.id)},
      ${JSON.stringify({runId:body.runId||null,agentId:body.agentId,companyId:body.companyId||null,context,deduped})}::jsonb,
      'PAPERCLIP',${String(body.runId||taskId)})`;

  return NextResponse.json({
    ok:true,
    accepted:true,
    deduped,
    kmce_agent:assigned,
    kmce_task_id:Number(task.id),
    paperclip_run_id:body.runId||null,
    paperclip_task_id:context.taskId||context.issueId||null
  });
}
