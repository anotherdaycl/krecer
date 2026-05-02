const FAL_API_KEY = process.env.FAL_API_KEY;
const FAL_API_URL = "https://queue.fal.run/fal-ai/flux/schnell";

interface FluxResult {
  images: { url: string; content_type: string }[];
}

export async function generateProductImages(
  productName: string,
  category: string = "otro"
): Promise<string[]> {
  if (!FAL_API_KEY) {
    throw new Error("FAL_API_KEY not configured");
  }

  const styleMap: Record<string, string> = {
    ropa: "fashion photography, model wearing the garment, clean studio background, soft lighting, editorial style",
    cosmetica: "beauty product photography, clean white marble surface, soft natural light, luxury skincare aesthetic",
    accesorios: "product photography, elegant lifestyle setting, warm lighting, minimalist composition",
    comida: "food photography, appetizing presentation, warm tones, shallow depth of field, rustic wooden surface",
    otro: "professional product photography, clean white background, studio lighting, commercial quality",
  };

  const style = styleMap[category] || styleMap.otro;

  const prompts = [
    `Professional product photo of ${productName}. Clean white background, studio lighting, e-commerce ready, high resolution, commercial photography, centered composition.`,
    `${productName} in lifestyle context. ${style}. Professional quality, 4K resolution, Instagram-ready square format.`,
    `Close-up detail shot of ${productName}. ${style}. Macro photography showing texture and quality, professional lighting.`,
  ];

  const results = await Promise.all(
    prompts.map(async (prompt) => {
      const response = await fetch(FAL_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Key ${FAL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          image_size: "square",
          num_inference_steps: 4,
          num_images: 1,
          enable_safety_checker: true,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Flux API error: ${response.status} - ${error}`);
      }

      const data: FluxResult = await response.json();
      return data.images[0]?.url || "";
    })
  );

  return results.filter(Boolean);
}
