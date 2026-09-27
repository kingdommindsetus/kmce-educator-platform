import {NextResponse} from "next/server";import {workspace} from "../../../../../../lib/crm";
export const dynamic="force-dynamic";export const revalidate=0;
export async function GET(){return NextResponse.json(await workspace())}