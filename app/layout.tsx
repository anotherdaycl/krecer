import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kreati — Posts profesionales en segundos",
  description:
    "Sube la foto de tu producto, recibe 3 imágenes profesionales + copy listo para Instagram. $10/mes.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
