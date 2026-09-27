import {NextResponse} from "next/server";import {leadDetail} from "../../../../../lib/crm";
export const dynamic="force-dynamic";
export async function GET(_:Request,{params}:{params:{id:string}}){const data=await leadDetail(Number(params.id));return data?NextResponse.json(data):NextResponse.json({error:"Not found"},{status:404})}