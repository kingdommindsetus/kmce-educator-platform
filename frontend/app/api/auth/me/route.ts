import { NextResponse } from "next/server";
import { currentUser } from "../../../../lib/auth";
export const dynamic="force-dynamic";
export async function GET(){
  const u=await currentUser();
  return u?NextResponse.json(u):NextResponse.json({error:"unauthenticated"},{status:401});
}
