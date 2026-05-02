const FAL_API_KEY = process.env.FAL_API_KEY;
// fal.run (sin "queue.") es el endpoint síncrono — devuelve las imágenes directamente
const FAL_API_URL = "https://fal.run/fal-ai/flux/dev";
const TIMEOUT_MS = 60000;

interface FluxResult {
  images: { url: string; content_type: string }[];
}

async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
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
      const response = await fetchWithTimeout(FAL_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Key ${FAL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          image_size: "square_hd",
          num_inference_steps: 28,
          num_images: 1,
          enable_safety_checker: true,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Flux API error: ${response.status} - ${error}`);
      }

      const data: FluxResult = await response.json();

      if (!Array.isArray(data.images) || data.images.length === 0) {
        throw new Error("Flux API returned no images");
      }

      return data.images[0].url;
    })
  );

  return results.filter(Boolean);
}
