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
      // Shorthand comparison slugs
      { source: "/compare/wati", destination: "/compare/fizmoh-vs-wati", permanent: true },
      { source: "/compare/interakt", destination: "/compare/fizmoh-vs-interakt", permanent: true },
      { source: "/compare/twilio", destination: "/compare/fizmoh-vs-twilio", permanent: true },
      { source: "/compare/respond-io", destination: "/compare/fizmoh-vs-respond-io", permanent: true },
      { source: "/compare/sleekflow", destination: "/compare/fizmoh-vs-sleekflow", permanent: true },
      { source: "/compare/gallabox", destination: "/compare/fizmoh-vs-gallabox", permanent: true },
      // Shorthand solution & industry slugs
      { source: "/solutions/restaurants", destination: "/solutions/restaurants-dining", permanent: true },
      { source: "/solutions/dining", destination: "/solutions/restaurants-dining", permanent: true },
      { source: "/solutions/cafes", destination: "/solutions/cafes-coffee", permanent: true },
      { source: "/solutions/coffee", destination: "/solutions/cafes-coffee", permanent: true },
      { source: "/solutions/ecommerce", destination: "/solutions/ecommerce-online-stores", permanent: true },
      { source: "/solutions/online-stores", destination: "/solutions/ecommerce-online-stores", permanent: true },
      { source: "/solutions/fashion", destination: "/solutions/fashion-perfumes-retail", permanent: true },
      { source: "/solutions/retail", destination: "/solutions/fashion-perfumes-retail", permanent: true },
      { source: "/solutions/salons", destination: "/solutions/salons-beauty-spas", permanent: true },
      { source: "/solutions/spas", destination: "/solutions/salons-beauty-spas", permanent: true },
      { source: "/solutions/supermarkets", destination: "/solutions/supermarkets-marts", permanent: true },
      { source: "/solutions/tours", destination: "/solutions/tours-safari-musandam", permanent: true },
      { source: "/solutions/musandam", destination: "/solutions/tours-safari-musandam", permanent: true },
      { source: "/solutions/clinics", destination: "/solutions/clinics-hospitals-health", permanent: true },
      { source: "/solutions/hospitals", destination: "/solutions/clinics-hospitals-health", permanent: true },
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
          {
            key: "Content-Security-Policy-Report-Only",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https: blob:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src 'self' https: wss:; frame-src 'self' https:; object-src 'none'; base-uri 'self';",
          },
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
        source: "/card/:path*",
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
