const adjectives: Record<string, string[]> = {
  ropa: ["Premium", "Exclusiva", "Única", "Trendy", "Elegante", "Cómoda"],
  cosmetica: ["Natural", "Profesional", "Dermatológica", "Hidratante", "Rejuvenecedora"],
  accesorios: ["Artesanal", "Minimalista", "Sofisticado", "Versátil", "Original"],
  comida: ["Artesanal", "Deliciosa", "Irresistible", "Casera", "Premium"],
  otro: ["Único", "Original", "Premium", "Especial", "Exclusivo"],
};

const benefits: Record<string, string[]> = {
  ropa: [
    "Perfecta para cualquier ocasión",
    "Comodidad todo el día",
    "Estilo que marca la diferencia",
    "Diseño que no pasa de moda",
  ],
  cosmetica: [
    "Resultados visibles desde la primera aplicación",
    "Cuida tu piel de forma natural",
    "Fórmula probada dermatológicamente",
    "Tu rutina de skincare favorita",
  ],
  accesorios: [
    "Combina con todo tu closet",
    "El detalle que completa tu look",
    "Hecho para destacar",
    "Calidad que se nota al tacto",
  ],
  comida: [
    "Sabor que enamora desde el primer bocado",
    "Hecho con los mejores ingredientes",
    "Para disfrutar y compartir",
    "Calidad artesanal en cada detalle",
  ],
  otro: [
    "Calidad garantizada",
    "Diseñado para ti",
    "La mejor elección",
    "No te vas a arrepentir",
  ],
};

const ctas = [
  "Escríbeme por DM para más info",
  "Link en bio para comprar",
  "Disponible ahora, escríbeme",
  "Últimas unidades, no te quedes sin el tuyo",
  "Envíos a todo Chile",
];

const hashtagSets: Record<string, string[]> = {
  ropa: ["#moda", "#estilo", "#outfit", "#tendencia", "#hechoenchile", "#emprendedora"],
  cosmetica: ["#skincare", "#belleza", "#cuidadodelapiel", "#beauty", "#natural", "#emprendedora"],
  accesorios: ["#accesorios", "#handmade", "#diseño", "#estilo", "#regalo", "#emprendedora"],
  comida: ["#foodie", "#comidacasera", "#repostería", "#dulces", "#hechoenchile", "#emprendedora"],
  otro: ["#emprendimiento", "#emprendedora", "#hechoenchile", "#compralocal", "#pyme", "#apoyaemprendedores"],
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export interface GeneratedCopy {
  title: string;
  description: string;
  hashtags: string;
  cta: string;
  fullPost: string;
}

export function generateCopy(
  productName: string,
  category: string = "otro"
): GeneratedCopy {
  const cat = category in adjectives ? category : "otro";
  const adj = pick(adjectives[cat]);
  const benefit = pick(benefits[cat]);
  const cta = pick(ctas);
  const tags = hashtagSets[cat].slice(0, 5).join(" ");

  const title = `${adj} ${productName}`;
  const description = `${benefit}. ${pick(benefits[cat])}`;

  const fullPost = `${title}\n\n${description}\n\n${cta}\n\n${tags}`;

  return { title, description, hashtags: tags, cta, fullPost };
}
