const FAL_API_KEY = process.env.FAL_API_KEY;
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

function detectGender(productName: string): "male" | "female" | "neutral" {
  const lower = productName.toLowerCase();
  const femaleKeywords = ["mujer", "femenin", "dama", "señora", "niña", "girl", "woman", "female", "mama", "mamá", "embarazada"];
  const maleKeywords = ["hombre", "masculin", "caballero", "señor", "niño", "boy", "man", "male", "papa", "papá", "caballero"];
  if (femaleKeywords.some((k) => lower.includes(k))) return "female";
  if (maleKeywords.some((k) => lower.includes(k))) return "male";
  return "neutral";
}

const backgroundMap: Record<string, string> = {
  ropa: "light gray seamless studio backdrop, professional fashion photography setup",
  cosmetica: "white marble surface, soft diffused studio lighting, luxury beauty aesthetic",
  accesorios: "clean off-white seamless background, elegant minimalist studio",
  comida: "white ceramic surface, bright clean food photography setup, natural light",
  otro: "pure white seamless background, professional studio lighting",
};

const tryOnBackgroundMap: Record<string, string> = {
  ropa: "clean light gray studio backdrop, professional fashion shoot",
  cosmetica: "bright bathroom or vanity setting, clean background",
  accesorios: "lifestyle studio setting, neutral background",
  comida: "not applicable",
  otro: "clean studio backdrop, neutral background",
};

export async function generateProductImages(
  productName: string,
  category: string = "otro"
): Promise<string[]> {
  if (!FAL_API_KEY) {
    throw new Error("FAL_API_KEY not configured");
  }

  const background = backgroundMap[category] || backgroundMap.otro;
  const tryOnBackground = tryOnBackgroundMap[category] || tryOnBackgroundMap.otro;
  const gender = detectGender(productName);

  const modelDescriptor =
    gender === "female"
      ? "young woman, female fashion model"
      : gender === "male"
        ? "young man, male fashion model"
        : "fashion model";

  const prompts = [
    // Imagen 1: producto solo, fondo profesional, frontal
    `Ultra high quality professional product photography of ${productName} for online store. ${background}. Product perfectly centered, sharp focus, crisp details, bright studio lighting with soft boxes, commercial e-commerce quality, no shadows, no blur, tack sharp, 8K resolution, photorealistic.`,

    // Imagen 2: producto solo, fondo profesional, ángulo diferente
    `Professional e-commerce photo of ${productName}, ${background}, three-quarter angle view or flat lay composition, ultra sharp focus, crisp textures, bright even lighting, high-end product photography for fashion online store, photorealistic, no blur, commercial quality.`,

    // Imagen 3: virtual try-on con modelo del género correcto
    `Virtual try-on photo: ${modelDescriptor} wearing ${productName}, ${tryOnBackground}, full body shot, natural confident pose, sharp focus on both model and product, professional fashion photography, editorial quality, bright studio lighting, photorealistic, high resolution, the garment fits perfectly and is clearly visible.`,
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
          image_size: "portrait_4_3",
          num_inference_steps: 28,
          guidance_scale: 3.5,
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
