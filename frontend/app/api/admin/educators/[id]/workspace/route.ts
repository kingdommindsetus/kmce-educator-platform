import {NextResponse} from "next/server";import {workspace} from "../../../../../../lib/crm";import {requireFounder} from "../../../../../../lib/auth";
export const dynamic="force-dynamic";export const revalidate=0;
export async function GET(){const u=await requireFounder();if(!u)return NextResponse.json({error:"forbidden"},{status:403});return NextResponse.json(await workspace())}
