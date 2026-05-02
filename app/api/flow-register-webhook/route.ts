import { NextRequest, NextResponse } from "next/server";
import { getCustomer, createSubscription } from "@/lib/flow";
import { createServerClient } from "@/lib/supabase-server";

const FLOW_PLAN_ID = process.env.FLOW_PLAN_ID!;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const customerId = formData.get("customerId") as string;
    const flowError = formData.get("error");

    console.log("Flow register webhook:", { customerId, flowError });

    if (!customerId || (flowError && flowError !== "0")) {
      console.error("Flow register webhook: error en registro de tarjeta", { customerId, flowError });
      return NextResponse.json({ error: "Card registration failed" }, { status: 400 });
    }

    // Obtener userId desde el externalId del cliente en Flow
    const customer = await getCustomer(customerId) as { customerId: string; externalId: string };
    const userId = customer.externalId;

    if (!userId) {
      console.error("Flow register webhook: no externalId para customerId", customerId);
      return NextResponse.json({ error: "No userId" }, { status: 400 });
    }

    // Crear suscripción al plan
    await createSubscription(customerId, FLOW_PLAN_ID);

    // Activar suscripción en Supabase con 10 créditos
    const supabase = createServerClient();
    const { error } = await supabase.from("subscriptions").upsert({
      user_id: userId,
      flow_customer_id: customerId,
      status: "active",
      credits: 10,
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
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
