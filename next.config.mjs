import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.dirname(fileURLToPath(import.meta.url));
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => { config.resolve.alias["@"] = path.join(root, "src"); return config; },
  serverExternalPackages: ["@prisma/client", ".prisma/client", "@prisma/adapter-pg", "bcryptjs"],
  // Prisma 6 driver adapter memuat query_compiler_bg.wasm saat runtime; pastikan ikut ter-trace di Vercel.
  outputFileTracingIncludes: { "/*": ["./node_modules/.prisma/client/*.wasm"] },
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
};
export default nextConfig;
