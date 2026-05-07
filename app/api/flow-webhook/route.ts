import { NextRequest, NextResponse } from "next/server";
import { getPaymentStatus } from "@/lib/flow";
import { createServerClient } from "@/lib/supabase-server";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CREDITS_PER_PACK = 10;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const token = formData.get("token") as string;

    if (!token) {
      return NextResponse.json({ error: "No token" }, { status: 400 });
    }

    const payment = await getPaymentStatus(token);
    console.log("Flow webhook payment:", JSON.stringify(payment));

    if (payment.status !== 2) {
      return NextResponse.json({ received: true });
    }

    const supabase = createServerClient();

    // Extract userId and promoCodeId from optional field
    let userId = "";
    let opt: Record<string, string> = {};
    try {
      opt = typeof payment.optional === "string"
        ? JSON.parse(payment.optional)
        : payment.optional ?? {};
      userId = opt?.userId || "";
    } catch { /* ignorar */ }

    // Fallback: decode UUID from commerceOrder (format "u<32hexchars>")
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
      .maybeSingle();

    if (existing) {
      console.log("Flow webhook: pago duplicado, ignorando", flowOrder);
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Leer créditos actuales para sumarlos
    const { data: currentSub } = await supabase
      .from("subscriptions")
      .select("credits")
      .eq("user_id", userId)
      .maybeSingle();

    const currentCredits = currentSub?.credits ?? 0;
    const newCredits = currentCredits + CREDITS_PER_PACK;

    const { error: upsertError } = await supabase.from("subscriptions").upsert({
      user_id: userId,
      status: "active",
      credits: newCredits,
      flow_order: flowOrder,
    }, { onConflict: "user_id" });

    if (upsertError) {
      console.error("Flow webhook: error guardando créditos", upsertError);
      return NextResponse.json({ error: "Failed to save credits" }, { status: 500 });
    }

    // Marcar código promo como usado si aplica
    const promoCodeId = opt?.promoCodeId;
    if (promoCodeId) {
      await supabase.from("promo_code_uses").insert({ promo_code_id: promoCodeId, user_id: userId });
      // Incrementar used_count atómicamente
      const { data: promo } = await supabase.from("promo_codes").select("used_count").eq("id", promoCodeId).single();
      if (promo) {
        await supabase.from("promo_codes").update({ used_count: promo.used_count + 1 }).eq("id", promoCodeId);
      }
      console.log("Flow webhook: código promo marcado como usado", promoCodeId);
    }

    console.log("Flow webhook: créditos actualizados para userId", userId, "→", newCredits);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Flow webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
