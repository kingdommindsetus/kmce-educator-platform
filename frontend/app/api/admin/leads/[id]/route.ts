import {NextResponse} from "next/server";import {leadDetail} from "../../../../../lib/crm";import {requireFounder} from "../../../../../lib/auth";
export const dynamic="force-dynamic";export const revalidate=0;
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){const u=await requireFounder();if(!u)return NextResponse.json({error:"forbidden"},{status:403});const data=await leadDetail(Number((await params).id));return data?NextResponse.json(data):NextResponse.json({error:"Not found"},{status:404})}
