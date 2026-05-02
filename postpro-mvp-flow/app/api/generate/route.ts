import { NextRequest, NextResponse } from "next/server";
import { generateProductImages } from "@/lib/flux-api";
import { generateCopy } from "@/lib/copy-templates";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const productName = formData.get("productName") as string;
    const category = formData.get("category") as string;

    if (!productName) {
      return NextResponse.json(
        { error: "Product name is required" },
        { status: 400 }
      );
    }

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
