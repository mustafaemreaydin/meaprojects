/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Don't fail the production build on lint issues (type-checking still runs).
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "bcryptjs", "adm-zip"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        // Tool iframe'leri `allow-same-origin` olmadan sandbox'landığı için
        // opak ("null") origin alır ve enjekte edilen @font-face fontları
        // panel origin'inden CORS ile çeker. Fontlar herkese açık statik
        // varlıklar olduğundan `*` ile servis etmek güvenli (sandbox'ı
        // zayıflatmadan null-origin iframe'lerin fontu yüklemesini sağlar).
        source: "/fonts/:path*",
        headers: [{ key: "Access-Control-Allow-Origin", value: "*" }],
      },
    ];
  },
};

export default nextConfig;
