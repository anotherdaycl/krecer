import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "").trim();
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0].trim() || "https";
  const from = req.nextUrl.searchParams.get("from") || "dashboard";
  const dest = from === "result" ? "/result" : "/dashboard";
  return NextResponse.redirect(`${proto}://${host}${dest}?payment=success`, 303);
}

export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get("from") || "dashboard";
  const dest = from === "result" ? "/result" : "/dashboard";
  const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "").trim();
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0].trim() || "https";
  return NextResponse.redirect(`${proto}://${host}${dest}?payment=success`, 303);
}
