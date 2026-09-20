import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empaquetado como app de escritorio: se sirve como archivos estáticos
  // dentro de Electron, sin servidor Next.js corriendo en producción.
  output: "export",
  images: {
    // La API de optimización de imágenes de Next.js no existe en export estático.
    unoptimized: true,
  },
};

export default nextConfig;
