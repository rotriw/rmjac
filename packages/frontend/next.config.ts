import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config) => {
    config.externals = [
      ...config.externals,
      /^(rmjac_core)$/i,
    ];
    return config;
  },
  devIndicators: false
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
require("./index");

export default nextConfig;
