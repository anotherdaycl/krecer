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
    ropa: "model wearing the garment, full body shot, neutral gray studio backdrop, even soft-box lighting",
    cosmetica: "product on white marble surface, flat lay or slight angle, soft diffused lighting, luxury beauty aesthetic",
    accesorios: "product on clean light gray surface, elegant minimalist studio setup, soft directional lighting",
    comida: "food on white ceramic plate, clean white background, bright natural lighting, professional food photography",
    otro: "product centered on seamless white background, professional studio lighting, commercial e-commerce shot",
  };

  const style = styleMap[category] || styleMap.otro;

  const prompts = [
    `Professional e-commerce product photo of ${productName}. Pure white seamless background, bright studio lighting, perfectly sharp focus, crisp and clear, high resolution, commercial product photography for online store, centered composition, no blur, tack sharp.`,
    `${productName} styled product photo, ${style}, sharp focus throughout, crisp details, professional online store photography, bright even lighting, no motion blur, high resolution, Instagram-ready.`,
    `Close-up detail shot of ${productName}, ${style}, extreme sharpness, crisp texture details, professional macro product photography for e-commerce, clean background, studio lighting, ultra clear and in focus.`,
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
