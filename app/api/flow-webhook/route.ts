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

    console.log("Flow webhook payment:", JSON.stringify(payment));

    // Status 2 = pagado exitosamente
    if (payment.status === 2) {
      const supabase = createServerClient();

      // Intenta extraer userId desde optional primero, luego desde commerceOrder
      let userId = "";
      try {
        const opt = typeof payment.optional === "string"
          ? JSON.parse(payment.optional)
          : payment.optional;
        userId = opt?.userId || "";
      } catch { /* ignorar */ }

      // Fallback: decodificar UUID desde commerceOrder (formato "u<32hexchars>")
      if (!userId || !UUID_REGEX.test(userId)) {
        const raw = (payment.commerceOrder || "").replace(/^u/, "");
        if (raw.length === 32) {
          userId = `${raw.slice(0,8)}-${raw.slice(8,12)}-${raw.slice(12,16)}-${raw.slice(16,20)}-${raw.slice(20)}`;
        }
      }

      console.log("Flow webhook userId:", userId, "commerceOrder:", payment.commerceOrder);

      if (!userId || !UUID_REGEX.test(userId)) {
        console.error("Flow webhook: userId inválido", { userId, payment });
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
