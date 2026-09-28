import {createHash} from "node:crypto";
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
  const currentHash=createHash("sha256").update(String(job.draft_content)).digest("hex");
  if(!job.approved_sha256 || job.approved_sha256!==currentHash){
    return NextResponse.json({error:"Approved draft no longer matches current content",reason:"APPROVED_DRAFT_MISMATCH"},{status:409});
  }

  const detail=`Provider-confirmed ${provider} send recorded with message id ${providerMessageId}; follow-up scheduled in 3 days.`;

  try{
    const [updated]=await q.transaction([
      q`
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
      `,
      q`
        UPDATE leads
        SET pipeline_stage='CONTACTED',
            assigned_agent='Echo',
            updated_at=now()
        WHERE id=${job.lead_id}
          AND pipeline_stage='APPROVED'
      `,
      q`
        INSERT INTO lead_activities(lead_id,actor_name,action,detail)
        VALUES(${job.lead_id},${actor},'OUTREACH_SENT',${detail})
      `
    ]);

    if(!updated.length){
      return NextResponse.json({error:"Send state transition blocked",reason:"SEND_STATE_TRANSITION_BLOCKED"},{status:409});
    }

    return NextResponse.json({
      ok:true,
      job:updated[0],
      provider_message_id:providerMessageId,
      provider_thread_id:providerThreadId||null
    });
  }catch(error){
    if(String(error).includes("outreach_jobs_provider_message_uidx") || String(error).includes("outreach_jobs_send_token_uidx")){
      return NextResponse.json({error:"Provider message already recorded",reason:"DUPLICATE_PROVIDER_MESSAGE"},{status:409});
    }
    throw error;
  }
}
