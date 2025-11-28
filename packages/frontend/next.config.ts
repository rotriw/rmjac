import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config) => {
    config.externals = [
      ...config.externals,
      /^(rmjac_core)$/i,
    ];

    config.experiments = Object.assign(config.experiments || {}, {
      asyncWebAssembly: true,
    });
    config.module.defaultRules = [
      {
        type: 'javascript/auto',
        resolve: {},
      },
      {
        test: /\.json$/i,
        type: 'json',
      },
    ];
    config.optimization.moduleIds = 'named';
    
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
    });
    return config;
  },
  devIndicators: false
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
require("./index");

export default nextConfig;
