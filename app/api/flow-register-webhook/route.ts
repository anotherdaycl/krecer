import { NextRequest, NextResponse } from "next/server";
import { getRegisterStatus, getCustomer, createSubscription } from "@/lib/flow";
import { createServerClient } from "@/lib/supabase-server";

const FLOW_PLAN_ID = process.env.FLOW_PLAN_ID!;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    // Flow sends `token` to url_registration, NOT customerId directly
    const token = formData.get("token") as string;

    console.log("Flow register webhook received token:", token);

    if (!token) {
      console.error("Flow register webhook: no token recibido");
      return NextResponse.json({ error: "No token" }, { status: 400 });
    }

    // Step 1: Get registration status (includes customerId and status)
    const regStatus = await getRegisterStatus(token) as {
      customerId: string;
      status: number;
      error?: number;
    };

    console.log("Flow getRegisterStatus:", regStatus);

    if (regStatus.status !== 1 || regStatus.error) {
      console.error("Flow register webhook: registro de tarjeta fallido", regStatus);
      return NextResponse.json({ error: "Card registration failed" }, { status: 400 });
    }

    const customerId = regStatus.customerId;
    if (!customerId) {
      console.error("Flow register webhook: no customerId en regStatus");
      return NextResponse.json({ error: "No customerId" }, { status: 400 });
    }

    // Step 2: Get userId from customer's externalId
    const customer = await getCustomer(customerId) as { customerId: string; externalId: string };
    const userId = customer.externalId;

    if (!userId) {
      console.error("Flow register webhook: no externalId para customerId", customerId);
      return NextResponse.json({ error: "No userId" }, { status: 400 });
    }

    // Step 3: Create subscription to monthly plan
    const sub = await createSubscription(customerId, FLOW_PLAN_ID) as {
      subscriptionId: string;
      status: number;
      period_start: string;
      period_end: string;
    };

    console.log("Flow subscription created:", sub);

    // Step 4: Activate in Supabase
    const supabase = createServerClient();
    const { error } = await supabase.from("subscriptions").upsert({
      user_id: userId,
      flow_customer_id: customerId,
      status: "active",
      credits: 10,
      current_period_start: sub.period_start
        ? new Date(sub.period_start).toISOString()
        : new Date().toISOString(),
      current_period_end: sub.period_end
        ? new Date(sub.period_end).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    if (error) {
      console.error("Flow register webhook: error guardando suscripción", error);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }

    console.log("Flow register webhook: suscripción activada para userId", userId);
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Flow register webhook error:", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
