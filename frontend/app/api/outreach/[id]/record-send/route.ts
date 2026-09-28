import {NextResponse} from "next/server";
import {ensureSchema,sql} from "../../../../../lib/db";
import {requireFounder} from "../../../../../lib/auth";

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  const u=await requireFounder();
  if(!u)return NextResponse.json({error:"forbidden"},{status:403});

  await ensureSchema();
  const q=sql();
  const id=Number((await params).id);
  const actor=u.display_name||u.email;
  const body=await req.json();
  const providerMessageId=String(body.provider_message_id||"").trim();
  const providerThreadId=String(body.provider_thread_id||"").trim();
  const provider=String(body.provider||"gmail").trim().toLowerCase();

  if(!providerMessageId){
    return NextResponse.json({error:"provider_message_id required"},{status:400});
  }

  const rows=await q`
    SELECT o.*,l.email,l.pipeline_stage,l.approval_status,
           l.contact_source_url,l.contact_verified_at
    FROM outreach_jobs o
    JOIN leads l ON l.id=o.lead_id
    WHERE o.id=${id}
  `;

  if(!rows.length)return NextResponse.json({error:"Outreach job not found"},{status:404});
  const job=rows[0];

  if(job.sent_at || job.status==="SENT"){
    return NextResponse.json({error:"Already sent; duplicate send blocked",reason:"DUPLICATE_SEND"},{status:409});
  }
  if(job.status!=="APPROVED" || job.pipeline_stage!=="APPROVED" || job.approval_status!=="APPROVED"){
    return NextResponse.json({error:"Founder-approved outreach required",reason:"NOT_APPROVED"},{status:409});
  }
  if(!job.email || !job.contact_source_url || !job.contact_verified_at){
    return NextResponse.json({error:"Verified recipient, official source, and verification timestamp required",reason:"CONTACT_NOT_VERIFIED"},{status:409});
  }

  const finalized=await q.transaction(async(tx)=>{
    const updated=await tx`
      UPDATE outreach_jobs
      SET status='SENT',
          send_token=${providerMessageId},
          provider=${provider},
          provider_message_id=${providerMessageId},
          provider_thread_id=${providerThreadId||null},
          sent_at=now(),
          sent_by=${actor},
          delivery_status='SUBMITTED',
          follow_up_due_at=now()+interval '3 days',
          updated_at=now()
      WHERE id=${id}
        AND status='APPROVED'
        AND sent_at IS NULL
      RETURNING *
    `;

    if(!updated.length)throw new Error("SEND_STATE_TRANSITION_BLOCKED");

    const sent=updated[0];

    await tx`
      UPDATE leads
      SET pipeline_stage='CONTACTED',
          assigned_agent='Echo',
          updated_at=now()
      WHERE id=${sent.lead_id}
    `;

    await tx`
      INSERT INTO lead_activities(lead_id,actor_name,action,detail)
      VALUES(
        ${sent.lead_id},
        ${actor},
        'OUTREACH_SENT',
        ${`Provider-confirmed ${provider} send recorded with message id ${providerMessageId}; follow-up scheduled in 3 days.`}
      )
    `;

    return sent;
  });

  return NextResponse.json({ok:true,job:finalized,provider_message_id:providerMessageId,provider_thread_id:providerThreadId||null});
}
