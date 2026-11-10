import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": [
        {
          condition: { path: /[.]module[.]css$/ },
          loaders: ["@tailwindcss/turbopack"],
          as: "*.module.css",
        },
        {
          condition: { not: { path: /[.]module[.]css$/ } },
          loaders: ["@tailwindcss/turbopack"],
          as: "*.css",
        },
      ],
    },
  },
};

export default withNextIntl(nextConfig);
