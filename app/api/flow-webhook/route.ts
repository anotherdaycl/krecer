import { NextRequest, NextResponse } from "next/server";
import { getPaymentStatus } from "@/lib/flow";
import { createServerClient } from "@/lib/supabase-server";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  try {
    // Flow envía el token del pago en el body como form-urlencoded
    const formData = await req.formData();
    const token = formData.get("token") as string;

    if (!token) {
      return NextResponse.json({ error: "No token" }, { status: 400 });
    }

    // Consulta el estado del pago a Flow (esto actúa como verificación implícita)
    const payment = await getPaymentStatus(token);

    // Status 2 = pagado exitosamente
    if (payment.status === 2) {
      const supabase = createServerClient();

      // Extrae userId del campo optional
      let userId = "";
      try {
        const optional = JSON.parse(payment.optional || "{}");
        userId = optional.userId || "";
      } catch {
        userId = payment.commerceOrder?.split("_")[1] || "";
      }

      if (!userId || !UUID_REGEX.test(userId)) {
        console.error("Flow webhook: userId inválido o ausente", { userId, flowOrder: payment.flowOrder });
        return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
      }

      const flowOrder = payment.flowOrder?.toString() || "";

      // Idempotencia: no procesar el mismo pago dos veces
      const { data: existing } = await supabase
        .from("subscriptions")
        .select("flow_order")
        .eq("flow_order", flowOrder)
        .single();

      if (existing) {
        return NextResponse.json({ received: true, duplicate: true });
      }

      // Activa suscripción con 10 créditos
      const { error: upsertError } = await supabase.from("subscriptions").upsert({
        user_id: userId,
        status: "active",
        credits: 10,
        flow_order: flowOrder,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
      });

      if (upsertError) {
        console.error("Flow webhook: error guardando suscripción", upsertError);
        return NextResponse.json(
          { error: "Failed to save subscription" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Flow webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
