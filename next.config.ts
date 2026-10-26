import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "export",
  // Emit `/self-register/index.html` instead of `/self-register.html`, so a
  // plain static host can serve clean URLs without rewrite rules.
  trailingSlash: true,
};

export default nextConfig;
