import "./globals.css";
import type { Metadata } from "next";
import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kreati — Posts profesionales en segundos",
  description:
    "Sube la foto de tu producto, recibe 3 imágenes profesionales + copy listo para Instagram.",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  openGraph: {
    title: "Kreati — Posts profesionales en segundos",
    description: "Sube la foto de tu producto, recibe 3 imágenes profesionales + copy listo para Instagram.",
    images: [{ url: "/icon.png" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={poppins.variable}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
