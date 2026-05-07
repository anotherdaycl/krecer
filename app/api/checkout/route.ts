import { NextRequest, NextResponse } from "next/server";
import { createPayment } from "@/lib/flow";

const CREDIT_PACK_AMOUNT = 9990;
const CREDIT_PACK_DESCRIPTION = "Kreati - 10 créditos";

export async function POST(req: NextRequest) {
  try {
    const { userId, email } = await req.json();

    if (!userId || !email) {
      return NextResponse.json({ error: "userId and email required" }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "").trim();
    const proto = req.headers.get("x-forwarded-proto")?.split(",")[0].trim() || "https";
    const baseUrl = `${proto}://${host}`;

    const { url } = await createPayment(
      CREDIT_PACK_AMOUNT,
      email,
      userId,
      CREDIT_PACK_DESCRIPTION,
      baseUrl
    );

    return NextResponse.json({ url });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[checkout] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
