import { NextRequest, NextResponse } from "next/server";
import { generateProductImages } from "@/lib/flux-api";
import { generateCopy } from "@/lib/copy-templates";
import { createServerClient } from "@/lib/supabase-server";

const VALID_CATEGORIES = ["ropa", "cosmetica", "accesorios", "comida", "otro"];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const productNameRaw = formData.get("productName");
    if (!productNameRaw || typeof productNameRaw !== "string" || !productNameRaw.trim()) {
      return NextResponse.json({ error: "Product name is required" }, { status: 400 });
    }
    const productName = productNameRaw.trim();

    const imageFile = formData.get("image");
    if (!imageFile || !(imageFile instanceof File)) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }

    const categoryRaw = formData.get("category");
    const category = (typeof categoryRaw === "string" && VALID_CATEGORIES.includes(categoryRaw))
      ? categoryRaw : "otro";

    const userId = formData.get("userId");

    // Si viene userId (usuario suscrito), verificar y descontar crédito en el servidor
    if (userId && typeof userId === "string") {
      const supabase = createServerClient();
      const { data: sub, error } = await supabase
        .from("subscriptions")
        .select("credits, status")
        .eq("user_id", userId)
        .single();

      if (error || !sub || sub.status !== "active" || sub.credits <= 0) {
        return NextResponse.json({ error: "Sin créditos disponibles" }, { status: 403 });
      }

      // Descontar crédito antes de generar
      await supabase
        .from("subscriptions")
        .update({ credits: sub.credits - 1 })
        .eq("user_id", userId);
    }

    // Convertir imagen a base64
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const imageDataUrl = `data:${imageFile.type};base64,${base64}`;

    const imageUrls = await generateProductImages(productName, category, imageDataUrl);
    const copy = generateCopy(productName, category);

    return NextResponse.json({
      success: true,
      images: imageUrls,
      copy,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Generation error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
