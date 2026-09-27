import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req:NextRequest){
  const p=req.nextUrl.pathname;
  if(p.startsWith("/_next")||p==="/sign-in"||p.startsWith("/api/health")) return NextResponse.next();
  const hasSession=[...req.cookies.getAll()].some(c=>/session/i.test(c.name));
  if(!hasSession){
    const u=req.nextUrl.clone();u.pathname="/sign-in";u.search="";
    return NextResponse.redirect(u);
  }
  return NextResponse.next();
}

export const config={matcher:["/((?!favicon.ico).*)"]};
