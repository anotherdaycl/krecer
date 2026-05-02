const FAL_API_KEY = process.env.FAL_API_KEY;
const FAL_API_URL = "https://fal.run/fal-ai/nano-banana-2/edit";
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
  ropa: "soft warm beige fabric backdrop with gentle draped linen texture, subtle shadows, fashion editorial studio lighting",
  cosmetica: "white marble surface with delicate dried flowers and golden accents, soft warm natural light, luxury skincare aesthetic",
  accesorios: "ivory textured paper background with a single dried pampas grass stem, warm side lighting casting a soft elegant shadow, high-end boutique feel",
  comida: "rustic light oak wooden table with scattered herbs and a linen napkin, warm natural window light, artisan food photography",
  otro: "clean light warm gray seamless backdrop with soft gradient shadow, bright professional studio lighting",
};

const tryOnBackgroundMap: Record<string, string> = {
  ropa: "bright airy studio with white walls, soft natural light from the side, minimalist fashion shoot",
  cosmetica: "clean bright vanity or bathroom setting with soft warm light",
  accesorios: "upscale café or boutique interior with blurred warm bokeh background, lifestyle fashion setting",
  comida: "bright modern kitchen with light wood tones",
  otro: "clean neutral studio with soft warm background",
};

export async function generateProductImages(
  productName: string,
  category: string = "otro",
  imageUrl?: string
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
    // Imagen 1: reemplazar fondo con fondo profesional para tienda
    `Take this product image and replace the background with a ${background}. Keep the product exactly as it is, do not change the product itself. Make it look like a professional e-commerce product photo with bright studio lighting, sharp focus, commercial quality for an online store.`,

    // Imagen 2: otro ángulo o composición con fondo pro
    `Take this product image and place it on a ${background}. Present it from a slightly different angle or as a flat lay. Keep the product identical, only change the background and lighting. Professional online store photography, ultra sharp, bright even lighting, high-end commercial quality.`,

    // Imagen 3: virtual try-on con modelo del género correcto
    `Using this product image as reference, create a virtual try-on photo showing a ${modelDescriptor} wearing this exact ${productName}. ${tryOnBackground}. Full body shot, natural confident pose, the garment must match exactly what is shown in the reference image. Professional fashion photography, sharp focus, studio lighting, photorealistic.`,
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
          ...(imageUrl ? { image_urls: [imageUrl] } : {}),
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
