/** @type {import('next').NextConfig} */

// Allow next/image to load the public payment QR from Supabase Storage.
let supabaseHost;
try {
  supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
} catch {
  supabaseHost = undefined;
}

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/site-assets/**",
          },
        {
          protocol: "https",
          hostname: supabaseHost,
          pathname: "/storage/v1/object/sign/participant-docs/**",
        },
      ]
      : [],
  },
  // Needed so the PDF and Excel libraries run correctly in route handlers.
  serverExternalPackages: ["@react-pdf/renderer", "exceljs"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
