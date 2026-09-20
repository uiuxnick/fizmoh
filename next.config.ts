import type { NextConfig } from "next";
import { ADMIN_SLUGS } from "./src/lib/admin-routes";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  experimental: {
    optimizePackageImports: ["lucide-react"],
    proxyClientMaxBodySize: "50mb",
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  /*
   * The Products and Industries menus were rebuilt as dedicated pages
   * (src/lib/marketing/*). These 308s carry the old, widely-linked slugs —
   * from the blog, llms.txt and external inbound links — onto their nearest
   * new page so no equity or bookmark is dropped.
   */
  async redirects() {
    return [
      { source: "/product/crm", destination: "/product/team-inbox", permanent: true },
      { source: "/product/templates", destination: "/product/botflow-studio", permanent: true },
      { source: "/product/woocommerce", destination: "/solutions/ecommerce-online-stores", permanent: true },
      { source: "/product/restaurant", destination: "/solutions/restaurants-dining", permanent: true },
      { source: "/product/tours", destination: "/solutions/tours-safari-musandam", permanent: true },
      { source: "/product/appointments", destination: "/solutions/clinics-hospitals-health", permanent: true },
    ]
  },
  async headers() {
    return [
      {
        source: "/",
        headers: [
          { key: "Cache-Control", value: "public, max-age=60, stale-while-revalidate=600" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
      {
        source: "/order/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Cross-Origin-Opener-Policy", value: "unsafe-none" },
        ],
      },
      {
        source: "/menu/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Cross-Origin-Opener-Policy", value: "unsafe-none" },
        ],
      },
      {
        source: "/kitchen",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Cross-Origin-Opener-Policy", value: "unsafe-none" },
        ],
      },
      {
        // The shell navigates without reloading the document, so every shell
        // entry point needs the same first-party device policy as the inbox.
        source: `/:view(${[...ADMIN_SLUGS, "admin"].join("|")})`,
        headers: [{ key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(self)" }],
      },
      {
        source: "/",
        headers: [{ key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(self)" }],
      },
    ]
  },
};

export default nextConfig;
