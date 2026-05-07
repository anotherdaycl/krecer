import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

const BASE_AMOUNT = 9990;

export async function POST(req: NextRequest) {
  try {
    const { code, userId } = await req.json();

    if (!code || !userId) {
      return NextResponse.json({ valid: false, error: "Código y usuario requeridos" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Buscar el código
    const { data: promo, error } = await supabase
      .from("promo_codes")
      .select("*")
      .eq("code", code.toUpperCase().trim())
      .eq("is_active", true)
      .single();

    if (error || !promo) {
      return NextResponse.json({ valid: false, error: "Código no válido" });
    }

    // Verificar vencimiento
    if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, error: "Este código ya venció" });
    }

    // Verificar usos disponibles
    if (promo.max_uses !== null && promo.used_count >= promo.max_uses) {
      return NextResponse.json({ valid: false, error: "Este código ya fue utilizado" });
    }

    // Verificar si este usuario ya lo usó
    const { data: alreadyUsed } = await supabase
      .from("promo_code_uses")
      .select("id")
      .eq("promo_code_id", promo.id)
      .eq("user_id", userId)
      .maybeSingle();

    if (alreadyUsed) {
      return NextResponse.json({ valid: false, error: "Ya usaste este código" });
    }

    // Calcular precio final
    let finalAmount = BASE_AMOUNT;
    if (promo.discount_type === "percent") {
      finalAmount = Math.round(BASE_AMOUNT * (1 - promo.discount_value / 100));
    } else if (promo.discount_type === "fixed") {
      finalAmount = Math.max(0, BASE_AMOUNT - promo.discount_value);
    }

    return NextResponse.json({
      valid: true,
      promoCodeId: promo.id,
      discountType: promo.discount_type,
      discountValue: promo.discount_value,
      finalAmount,
    });
  } catch (err) {
    console.error("[validate-promo] error:", err);
    return NextResponse.json({ valid: false, error: "Error al validar el código" }, { status: 500 });
  }
}
