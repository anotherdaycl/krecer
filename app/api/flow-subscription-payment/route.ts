import { NextRequest, NextResponse } from "next/server";
import { getCustomer } from "@/lib/flow";
import { createServerClient } from "@/lib/supabase-server";

// Flow llama aquí cada mes cuando cobra la suscripción automáticamente.
// Configura esta URL en tu plan de Flow: https://krecer.vercel.app/api/flow-subscription-payment
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const customerId = formData.get("customerId") as string;
    const status = formData.get("status");
    const subscriptionId = formData.get("subscriptionId") as string;

    console.log("Flow subscription payment webhook:", { customerId, status, subscriptionId });

    // Solo procesar pagos exitosos (status 2)
    if (String(status) !== "2") {
      console.log("Flow subscription payment: pago no exitoso, status:", status);
      return NextResponse.json({ received: true });
    }

    if (!customerId) {
      return NextResponse.json({ error: "No customerId" }, { status: 400 });
    }

    const customer = await getCustomer(customerId) as { externalId: string };
    const userId = customer.externalId;

    if (!userId) {
      console.error("Flow subscription payment: no userId para customerId", customerId);
      return NextResponse.json({ error: "No userId" }, { status: 400 });
    }

    // Renovar créditos por un mes más
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
      console.error("Flow subscription payment: error renovando créditos", error);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }

    console.log("Flow subscription payment: créditos renovados para userId", userId);
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Flow subscription payment error:", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
