import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.dirname(fileURLToPath(import.meta.url));
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { dev }) => {
    config.resolve.alias["@"] = path.join(root, "src");
    // Restart server mendadak sering mengkorupsi cache webpack di .next.
    // Dev tidak perlu cache persistence; produksi tetap memakai cache Next.js.
    if (dev) config.cache = false;
    return config;
  },
  serverExternalPackages: ["@prisma/client", ".prisma/client", "@prisma/adapter-pg", "bcryptjs"],
  // Prisma 6 driver adapter memuat query_compiler_bg.wasm saat runtime; pastikan ikut ter-trace di Vercel.
  outputFileTracingIncludes: { "/*": ["./node_modules/.prisma/client/*.wasm"] },
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
};
export default nextConfig;
