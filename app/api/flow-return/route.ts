import { NextRequest, NextResponse } from "next/server";

// Flow hace POST a urlReturn después de un pago exitoso
export async function POST(req: NextRequest) {
  const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "").trim();
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0].trim() || "https";
  return NextResponse.redirect(`${proto}://${host}/dashboard?payment=success`, 303);
}

// Por si Flow hace GET en algún caso
export async function GET() {
  return NextResponse.redirect("/dashboard?payment=success", 303);
}
