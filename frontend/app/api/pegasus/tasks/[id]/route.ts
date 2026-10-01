import {NextResponse} from "next/server";
import {requireFounder} from "../../../../../lib/auth";
import {getPegasusTask,transitionPegasusTask,PEGASUS_STATUSES} from "../../../../../lib/pegasus";
export const runtime="nodejs"; export const dynamic="force-dynamic";

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
 const founder=await requireFounder(); if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
 const {id}=await params; const task=await getPegasusTask(Number(id));
 return task?NextResponse.json({system:"PEGASUS",task}):NextResponse.json({error:"Task not found"},{status:404});
}
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
 const founder=await requireFounder(); if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
 const {id}=await params; const body=await req.json().catch(()=>null);
 if(!body?.to_status||!PEGASUS_STATUSES.includes(body.to_status))return NextResponse.json({error:"Valid to_status is required"},{status:400});
 const result=await transitionPegasusTask({id:Number(id),to_status:body.to_status,actor:founder.email,reason:body.reason,evidence:body.evidence});
 if("error" in result)return NextResponse.json({error:result.error},{status:result.status});
 return NextResponse.json({system:"PEGASUS",...result});
}
