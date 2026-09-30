import {NextResponse} from "next/server";
import {requireFounder} from "../../../../../lib/auth";
import {ensureSchema,sql} from "../../../../../lib/db";
import {PEGASUS_AVATAR_PACK_V1} from "../../../../../lib/pegasus-avatar-registry";
import {generateAgentReply,type AgentLlmMessage} from "../../../../../lib/agent-llm";

export const runtime="nodejs";
export const dynamic="force-dynamic";

function clean(v:unknown,max=4000){
  return String(v??"").replace(/\s+/g," ").trim().slice(0,max);
}

export async function GET(_req:Request,{params}:{params:Promise<{agentId:string}>}){
  const founder=await requireFounder();
  if(!founder) return NextResponse.json({error:"Founder access required"},{status:403});
  const {agentId}=await params;
  const agent=PEGASUS_AVATAR_PACK_V1.find(a=>a.id===String(agentId).toLowerCase());
  if(!agent) return NextResponse.json({error:"Unknown agent"},{status:404});
  await ensureSchema();
  const q=sql();
  const sessions=await q`
    SELECT id,agent_name,status,title,summary,created_at,updated_at
    FROM agent_conversation_sessions
    WHERE agent_name=${agent.name} AND founder_email=${founder.email}
    ORDER BY updated_at DESC,id DESC LIMIT 1
  `;
  const session=(sessions as any[])[0]||null;
  let messages:any[]=[];
  if(session){
    messages=await q`
      SELECT id,role,content,metadata,created_at
      FROM agent_conversation_messages
      WHERE session_id=${Number(session.id)}
      ORDER BY id ASC LIMIT 100
    `;
  }
  return NextResponse.json({agent,session,messages});
}

export async function POST(req:Request,{params}:{params:Promise<{agentId:string}>}){
  const founder=await requireFounder();
  if(!founder) return NextResponse.json({error:"Founder access required"},{status:403});
  const {agentId}=await params;
  const agent=PEGASUS_AVATAR_PACK_V1.find(a=>a.id===String(agentId).toLowerCase());
  if(!agent) return NextResponse.json({error:"Unknown agent"},{status:404});
  const body=await req.json().catch(()=>({}));
  const userText=clean(body.message,3000);
  const requestedSession=Number(body.session_id||0);
  if(!userText) return NextResponse.json({error:"message required"},{status:400});

  await ensureSchema();
  const q=sql();
  let session:any=null;
  if(Number.isInteger(requestedSession)&&requestedSession>0){
    const rows=await q`
      SELECT id,agent_name,status,summary
      FROM agent_conversation_sessions
      WHERE id=${requestedSession} AND agent_name=${agent.name} AND founder_email=${founder.email}
      LIMIT 1
    `;
    session=(rows as any[])[0]||null;
  }
  if(!session){
    const rows=await q`
      INSERT INTO agent_conversation_sessions(agent_name,founder_email,title,metadata)
      VALUES(${agent.name},${founder.email},${"Conversation with "+agent.name},${JSON.stringify({agent_id:agent.id})}::jsonb)
      RETURNING id,agent_name,status,title,summary,created_at,updated_at
    `;
    session=(rows as any[])[0];
  }

  await q`
    INSERT INTO agent_conversation_messages(session_id,agent_name,role,content,metadata)
    VALUES(${Number(session.id)},${agent.name},'FOUNDER',${userText},${JSON.stringify({input_mode:String(body.input_mode||"text")})}::jsonb)
  `;

  const [recent,memoryRows,taskRows,knowledgeRows]=await Promise.all([
    q`SELECT role,content FROM agent_conversation_messages WHERE session_id=${Number(session.id)} ORDER BY id DESC LIMIT 16`,
    q`SELECT memory_type,content,importance,topics,created_at FROM agent_memories WHERE agent_name=${agent.name} ORDER BY importance DESC,created_at DESC LIMIT 10`,
    q`SELECT id,title,instruction,status,source,created_at FROM agent_tasks WHERE lower(assigned_agent)=lower(${agent.name}) AND status NOT IN ('DONE','CANCELLED') ORDER BY created_at DESC LIMIT 10`,
    q`SELECT id,title,source_type,source_path,left(content,1400) AS excerpt
      FROM knowledge_documents
      WHERE is_canonical=true
        AND to_tsvector('english',coalesce(title,'')||' '||content) @@ plainto_tsquery('english',${userText})
      ORDER BY ts_rank(to_tsvector('english',coalesce(title,'')||' '||content),plainto_tsquery('english',${userText})) DESC,synced_at DESC
      LIMIT 6`,
  ]);

  const history=(recent as any[]).reverse();
  const memories=(memoryRows as any[]).map(m=>"- "+clean(m.content,800)).join("\n")||"- No persistent memories recorded yet.";
  const tasks=(taskRows as any[]).map(t=>"- ["+t.status+"] "+clean(t.title,300)+": "+clean(t.instruction,600)).join("\n")||"- No active tasks currently assigned.";
  const knowledge=(knowledgeRows as any[]).map(k=>"- "+clean(k.title||k.source_path,200)+": "+clean(k.excerpt,1200)).join("\n")||"- No directly matching canonical KMCE knowledge document was found for this turn.";
  const systemPrompt=[
    "You are "+agent.name+", the "+agent.role+" agent inside Kingdom Mindset CE (KMCE).",
    "Personality: "+agent.personality+".",
    "You are speaking privately with the founder in your office.",
    "Speak naturally, conversationally, and concisely. Do not sound like a report template.",
    "Use first person. You may disagree, ask a useful follow-up, or explain uncertainty.",
    "Never invent company facts. Distinguish supplied KMCE context from inference.",
    "Do not claim an external action was completed unless the supplied context proves it.",
    "Conversation itself has no authority to send, publish, pay, delete, or change external systems.",
    "", "PERSISTENT MEMORIES", memories, "", "YOUR ACTIVE TASKS", tasks, "", "RELEVANT KMCE KNOWLEDGE", knowledge,
  ].join("\n");

  const llmMessages:AgentLlmMessage[]=[
    {role:"system",content:systemPrompt},
    ...history.map((m:any)=>({role:m.role==="AGENT"?"assistant":"user",content:clean(m.content,3000)} as AgentLlmMessage)),
  ];
  const generated=await generateAgentReply(llmMessages);
  if(!generated.ok){
    return NextResponse.json({error:generated.error,detail:generated.detail,session_id:Number(session.id),agent_id:agent.id},{status:503});
  }

  const inserted=await q`
    INSERT INTO agent_conversation_messages(session_id,agent_name,role,content,metadata)
    VALUES(${Number(session.id)},${agent.name},'AGENT',${generated.text},${JSON.stringify({provider:generated.provider,model:generated.model,duration_ms:generated.duration_ms})}::jsonb)
    RETURNING id,role,content,metadata,created_at
  `;
  await q`
    INSERT INTO agent_memories(agent_name,memory_type,content,importance,topics,source_session_id,metadata)
    VALUES(${agent.name},'INTERACTION',${"Founder: "+userText+" | "+agent.name+": "+generated.text},55,'[]'::jsonb,${Number(session.id)},${JSON.stringify({source:"OFFICE_CONVERSATION"})}::jsonb)
  `;
  await q`UPDATE agent_conversation_sessions SET updated_at=now() WHERE id=${Number(session.id)}`;

  return NextResponse.json({
    status:"REPLIED",session_id:Number(session.id),agent_id:agent.id,agent_name:agent.name,
    message:(inserted as any[])[0],
    evidence:{memory_count:(memoryRows as any[]).length,active_task_count:(taskRows as any[]).length,knowledge_document_ids:(knowledgeRows as any[]).map(k=>Number(k.id))},
    llm:{provider:generated.provider,model:generated.model,duration_ms:generated.duration_ms},
  });
}