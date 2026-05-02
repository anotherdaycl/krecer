import { NextRequest, NextResponse } from "next/server";
import { createCustomer, registerCustomer } from "@/lib/flow";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const { userId, email, name } = await req.json();

    if (!userId || !email) {
      return NextResponse.json({ error: "userId and email required" }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "").trim();
    const proto = req.headers.get("x-forwarded-proto")?.split(",")[0].trim() || "https";
    const baseUrl = `${proto}://${host}`;

    const supabase = createServerClient();

    // Reusar cliente Flow si ya existe
    let flowCustomerId: string | null = null;
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("flow_customer_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingSub?.flow_customer_id) {
      flowCustomerId = existingSub.flow_customer_id;
    } else {
      const customer = await createCustomer(
        email,
        name || email.split("@")[0],
        userId
      ) as { customerId: string };
      flowCustomerId = customer.customerId;

      // Guardar el customerId para futuros pagos
      await supabase.from("subscriptions").upsert({
        user_id: userId,
        flow_customer_id: flowCustomerId,
        status: "pending",
        credits: 0,
      });
    }

    const { url } = await registerCustomer(flowCustomerId, baseUrl);
    return NextResponse.json({ url });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Flow checkout error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
