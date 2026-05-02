import { NextRequest, NextResponse } from "next/server";
import { getPaymentStatus } from "@/lib/flow";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    // Flow envía el token del pago en el body como form-urlencoded
    const formData = await req.formData();
    const token = formData.get("token") as string;

    if (!token) {
      return NextResponse.json({ error: "No token" }, { status: 400 });
    }

    // Consulta el estado del pago a Flow
    const payment = await getPaymentStatus(token);

    // Status 2 = pagado exitosamente
    if (payment.status === 2) {
      const supabase = createServerClient();

      // Extrae userId del campo optional
      let userId = "";
      try {
        const optional = JSON.parse(payment.optional || "{}");
        userId = optional.userId;
      } catch {
        userId = payment.commerceOrder?.split("_")[1] || "";
      }

      if (userId) {
        // Activa suscripción con 10 créditos
        await supabase.from("subscriptions").upsert({
          user_id: userId,
          status: "active",
          credits: 10,
          flow_order: payment.flowOrder?.toString() || "",
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
        });
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
