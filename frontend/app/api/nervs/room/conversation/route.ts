import {NextResponse} from "next/server";
import {requireFounder} from "../../../../../lib/auth";
import {ensureSchema,sql} from "../../../../../lib/db";
import {NERVS_AVATAR_PACK_V1} from "../../../../../lib/nervs-avatar-registry";
import {generateAgentReply,type AgentLlmMessage} from "../../../../../lib/agent-llm";

export const runtime="nodejs";
export const dynamic="force-dynamic";

function clean(v:unknown,max=4000){return String(v??"").replace(/\s+/g," ").trim().slice(0,max);}

function routeAgent(text:string){
  const t=text.toLowerCase();
  if(/market|competitor|research|trend|intelligence/.test(t)) return "Eyes";
  if(/campaign|ad spend|budget|economics|offer/.test(t)) return "Cammy";
  if(/marketing|funnel|promotion|positioning/.test(t)) return "Mark";
  if(/brand|catalog|collection|visual/.test(t)) return "Evan";
  if(/youtube|video|thumbnail|script/.test(t)) return "Tube";
  if(/social|instagram|facebook|tiktok|post/.test(t)) return "Lucy";
  if(/metric|analytics|conversion|growth|numbers|performance/.test(t)) return "Snake";
  if(/website|storefront|shopify|site|checkout/.test(t)) return "Alice";
  if(/outreach|email|lead|sales|follow.?up/.test(t)) return "Echo";
  if(/book|calendar|schedule|appointment|meeting time/.test(t)) return "Booker";
  if(/operations|process|workflow|team|organize/.test(t)) return "Marie";
  return "Simon";
}

export async function POST(req:Request){
  const founder=await requireFounder();
  if(!founder) return NextResponse.json({error:"Founder access required"},{status:403});
  const body=await req.json().catch(()=>({}));
  const userText=clean(body.message,3000);
  if(!userText) return NextResponse.json({error:"message required"},{status:400});
  const requested=clean(body.agent_name,80);
  const responderName=requested&&NERVS_AVATAR_PACK_V1.some(a=>a.name===requested)?requested:routeAgent(userText);
  const agent=NERVS_AVATAR_PACK_V1.find(a=>a.name===responderName)!;

  await ensureSchema();
  const q=sql();
  const allNames=NERVS_AVATAR_PACK_V1.map(a=>a.name);
  for(const name of allNames){
    await q`INSERT INTO agent_memories(agent_name,memory_type,content,importance,topics,metadata)
      VALUES(${name},'BROADCAST',${"Founder to NERVS room: "+userText},70,'[]'::jsonb,${JSON.stringify({source:"NERVS_ROOM"})}::jsonb)`;
  }

  let sessions=await q`SELECT id FROM agent_conversation_sessions WHERE agent_name='NERVS_ROOM' AND founder_email=${founder.email} AND status='ACTIVE' ORDER BY updated_at DESC LIMIT 1`;
  let session=(sessions as any[])[0];
  if(!session){
    const rows=await q`INSERT INTO agent_conversation_sessions(agent_name,founder_email,title,metadata)
      VALUES('NERVS_ROOM',${founder.email},'NERVS Room Conversation','{"scope":"ROOM"}'::jsonb) RETURNING id`;
    session=(rows as any[])[0];
  }
  await q`INSERT INTO agent_conversation_messages(session_id,agent_name,role,content,metadata)
    VALUES(${Number(session.id)},'NERVS_ROOM','FOUNDER',${userText},${JSON.stringify({broadcast:true})}::jsonb)`;

  const [historyRows,memoryRows,taskRows,knowledgeRows]=await Promise.all([
    q`SELECT role,content,metadata FROM agent_conversation_messages WHERE session_id=${Number(session.id)} ORDER BY id DESC LIMIT 14`,
    q`SELECT memory_type,content,importance FROM agent_memories WHERE agent_name=${agent.name} ORDER BY importance DESC,created_at DESC LIMIT 10`,
    q`SELECT id,title,instruction,status FROM agent_tasks WHERE lower(assigned_agent)=lower(${agent.name}) AND status NOT IN ('DONE','CANCELLED') ORDER BY created_at DESC LIMIT 10`,
    q`SELECT id,title,source_path,left(content,1400) AS excerpt FROM knowledge_documents
      WHERE is_canonical=true AND to_tsvector('english',coalesce(title,'')||' '||content) @@ plainto_tsquery('english',${userText})
      ORDER BY ts_rank(to_tsvector('english',coalesce(title,'')||' '||content),plainto_tsquery('english',${userText})) DESC LIMIT 6`,
  ]);

  const memories=(memoryRows as any[]).map(m=>"- "+clean(m.content,800)).join("\n")||"- None.";
  const tasks=(taskRows as any[]).map(t=>"- ["+t.status+"] "+clean(t.title,300)+": "+clean(t.instruction,600)).join("\n")||"- None.";
  const knowledge=(knowledgeRows as any[]).map(k=>"- "+clean(k.title||k.source_path,200)+": "+clean(k.excerpt,1200)).join("\n")||"- No direct canonical match.";
  const system=[
    "You are "+agent.name+", "+agent.role+", responding inside the KMCE NERVS Meeting Hall.",
    "Personality: "+agent.personality+".",
    "The founder just addressed the entire room. You were routed to answer first because your role is the best match.",
    "Answer naturally like a colleague in a live meeting. Do not read labels or produce a report template.",
    "If another agent should handle part of the request, say who and why. Do not pretend they already acted.",
    "Never invent company facts. External actions remain authority-gated.",
    "", "YOUR MEMORIES", memories, "", "YOUR ACTIVE TASKS", tasks, "", "RELEVANT KMCE KNOWLEDGE", knowledge
  ].join("\n");
  const history=(historyRows as any[]).reverse().map((m:any)=>({role:m.role==="AGENT"?"assistant":"user",content:clean(m.content,2500)} as AgentLlmMessage));
  const generated=await generateAgentReply([{role:"system",content:system},...history]);
  if(!generated.ok) return NextResponse.json({error:generated.error,detail:generated.detail,responder:agent.name},{status:503});

  const inserted=await q`INSERT INTO agent_conversation_messages(session_id,agent_name,role,content,metadata)
    VALUES(${Number(session.id)},'NERVS_ROOM','AGENT',${generated.text},${JSON.stringify({responder:agent.name,agent_id:agent.id,provider:generated.provider,model:generated.model})}::jsonb)
    RETURNING id,role,content,metadata,created_at`;
  await q`INSERT INTO agent_memories(agent_name,memory_type,content,importance,source_session_id,metadata)
    VALUES(${agent.name},'INTERACTION',${"Room reply to founder: "+generated.text},60,${Number(session.id)},${JSON.stringify({source:"NERVS_ROOM_REPLY"})}::jsonb)`;
  await q`UPDATE agent_conversation_sessions SET updated_at=now() WHERE id=${Number(session.id)}`;

  return NextResponse.json({status:"REPLIED",session_id:Number(session.id),responder:{id:agent.id,name:agent.name,role:agent.role},message:(inserted as any[])[0],broadcast_to:allNames});
}