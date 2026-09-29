import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typedRoutes: false,
  // Prisma's JS query compiler is loaded from a WASM file at runtime.
  // Next.js standalone tracing can miss this dynamically opened file,
  // which causes Prisma-only ENOENT errors even though pg works directly.
  outputFileTracingIncludes: {
    "/**": ["./node_modules/.prisma/client/**/*"],
  },
};

export default nextConfig;
