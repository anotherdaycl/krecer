import { NextRequest, NextResponse } from "next/server";
import { generateProductImages } from "@/lib/flux-api";
import { generateCopy } from "@/lib/copy-templates";

const VALID_CATEGORIES = ["ropa", "cosmetica", "accesorios", "comida", "otro"];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const productNameRaw = formData.get("productName");
    if (!productNameRaw || typeof productNameRaw !== "string" || !productNameRaw.trim()) {
      return NextResponse.json(
        { error: "Product name is required" },
        { status: 400 }
      );
    }
    const productName = productNameRaw.trim();

    const imageFile = formData.get("image");
    if (!imageFile) {
      return NextResponse.json(
        { error: "Image is required" },
        { status: 400 }
      );
    }

    const categoryRaw = formData.get("category");
    const category = (typeof categoryRaw === "string" && VALID_CATEGORIES.includes(categoryRaw))
      ? categoryRaw
      : "otro";

    // Generate images with Flux
    const imageUrls = await generateProductImages(productName, category);

    // Generate copy with templates
    const copy = generateCopy(productName, category);

    return NextResponse.json({
      success: true,
      images: imageUrls,
      copy,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate images" },
      { status: 500 }
    );
  }
}
