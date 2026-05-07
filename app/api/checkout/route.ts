import { NextRequest, NextResponse } from "next/server";
import { createPayment } from "@/lib/flow";
import { createServerClient } from "@/lib/supabase-server";

const BASE_AMOUNT = 9990;

async function applyPromo(
  supabase: ReturnType<typeof createServerClient>,
  promoCode: string,
  userId: string
): Promise<{ amount: number; promoCodeId: string | null }> {
  const { data: promo } = await supabase
    .from("promo_codes")
    .select("*")
    .eq("code", promoCode.toUpperCase().trim())
    .eq("is_active", true)
    .single();

  if (!promo) return { amount: BASE_AMOUNT, promoCodeId: null };
  if (promo.expires_at && new Date(promo.expires_at) < new Date()) return { amount: BASE_AMOUNT, promoCodeId: null };
  if (promo.max_uses !== null && promo.used_count >= promo.max_uses) return { amount: BASE_AMOUNT, promoCodeId: null };

  const { data: alreadyUsed } = await supabase
    .from("promo_code_uses")
    .select("id")
    .eq("promo_code_id", promo.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (alreadyUsed) return { amount: BASE_AMOUNT, promoCodeId: null };

  let finalAmount = BASE_AMOUNT;
  if (promo.discount_type === "percent") {
    finalAmount = Math.round(BASE_AMOUNT * (1 - promo.discount_value / 100));
  } else if (promo.discount_type === "fixed") {
    finalAmount = Math.max(0, BASE_AMOUNT - promo.discount_value);
  }

  return { amount: finalAmount, promoCodeId: promo.id };
}

export async function POST(req: NextRequest) {
  try {
    const { userId, email, promoCode } = await req.json();

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

    let amount = BASE_AMOUNT;
    let promoCodeId: string | null = null;

    if (promoCode) {
      const result = await applyPromo(supabase, promoCode, userId);
      amount = result.amount;
      promoCodeId = result.promoCodeId;
    }

    // Flow requires minimum amount of 1 CLP — handle 100% discount as free credits directly
    if (amount === 0) {
      const { error } = await supabase.from("subscriptions").upsert({
        user_id: userId,
        status: "active",
        credits: 10,
      }, { onConflict: "user_id" });

      if (!error && promoCodeId) {
        await supabase.from("promo_code_uses").insert({ promo_code_id: promoCodeId, user_id: userId });
        await supabase.from("promo_codes").update({ used_count: supabase.rpc ? undefined : undefined }).eq("id", promoCodeId);
        // Increment used_count
        await supabase.rpc("increment_promo_used", { promo_id: promoCodeId }).catch(() =>
          supabase.from("promo_codes").select("used_count").eq("id", promoCodeId).single().then(({ data }) =>
            data ? supabase.from("promo_codes").update({ used_count: data.used_count + 1 }).eq("id", promoCodeId) : null
          )
        );
      }

      return NextResponse.json({ free: true, url: `${baseUrl}/dashboard?payment=success` });
    }

    const description = promoCodeId
      ? `Kreati - 10 créditos (${promoCode?.toUpperCase()})`
      : "Kreati - 10 créditos";

    const { url } = await createPayment(amount, email, userId, description, baseUrl, promoCodeId);

    return NextResponse.json({ url });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[checkout] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
