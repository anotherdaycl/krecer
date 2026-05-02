import { NextRequest, NextResponse } from "next/server";
import { createPayment } from "@/lib/flow";

export async function POST(req: NextRequest) {
  try {
    const { userId, email } = await req.json();

    if (!userId || !email) {
      return NextResponse.json(
        { error: "userId and email required" },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Precio en CLP (aprox $10 USD)
    const amount = 8000;

    const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "").trim();
    const proto = req.headers.get("x-forwarded-proto")?.split(",")[0].trim() || "https";
    const baseUrl = `${proto}://${host}`;

    const { url } = await createPayment(
      amount,
      email,
      userId,
      "PostPro - 10 posts profesionales al mes",
      baseUrl
    );

    return NextResponse.json({ url });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Flow checkout error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
