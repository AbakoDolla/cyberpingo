/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Compression gzip/brotli des réponses HTTP
  compress: true,

  // Prépare le pipeline d'optimisation d'images (AVIF + WebP)
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 768, 1024, 1280, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128],
  },

  // Tree-shaking optimisé pour les imports de composants internes
  experimental: {
    optimizePackageImports: ["@/components/ui", "@/components/layout"],
  },

  // Headers de sécurité + cache sur tous les assets statiques
  async headers() {
    return [
      // Sécurité sur toutes les routes
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options",    value: "nosniff" },
          { key: "X-Frame-Options",            value: "DENY" },
          { key: "X-XSS-Protection",           value: "1; mode=block" },
          { key: "Referrer-Policy",            value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",         value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      // Cache long terme sur les assets statiques Next.js (hachés — safe)
      {
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      // Cache sur les fichiers publics (fonts, images, etc.)
      {
        source: "/public/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
