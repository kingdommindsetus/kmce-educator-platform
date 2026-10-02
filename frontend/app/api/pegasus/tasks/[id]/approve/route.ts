import {NextResponse} from "next/server";
import {requireFounder} from "../../../../../../lib/auth";
import {approvePegasusTask} from "../../../../../../lib/pegasus";
export const runtime="nodejs";

export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){
 const founder=await requireFounder(); if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
 const {id}=await params; const task=await approvePegasusTask(Number(id),founder.email);
 return task?NextResponse.json({system:"PEGASUS",approved:true,task}):NextResponse.json({error:"Task not found"},{status:404});
}
