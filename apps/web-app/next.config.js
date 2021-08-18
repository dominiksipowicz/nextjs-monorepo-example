// @ts-check

const path = require('path');
const { withSentryConfig } = require('@sentry/nextjs');
const { i18n } = require('./next-i18next.config');

// @ts-ignore
const packageJson = require('./package');

const NEXTJS_BUILD_TARGET = process.env.NEXTJS_BUILD_TARGET || 'server';
const NEXTJS_IGNORE_ESLINT = process.env.NEXTJS_IGNORE_ESLINT === '1' || false;
const isProd = process.env.NODE_ENV === 'production';

// Tell webpack to compile those packages
// @link https://www.npmjs.com/package/next-transpile-modules
const tmModules = [
  // for legacy browsers support (only in prod)
  ...(isProd
    ? [
        // ie: '@react-google-maps/api'...
      ]
    : []),
  // ESM only packages are not yet supported by NextJs
  // @link https://github.com/vercel/next.js/issues/23725
  // @link https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c
  ...[
    // ie: newer versions of https://github.com/sindresorhus packages
    'ky',
  ],
];
const withNextTranspileModules = require('next-transpile-modules')(tmModules, {
  resolveSymlinks: true,
  debug: false,
});

/**
 * A way to allow CI optimization when the build done there is not used
 * to deliver an image or deploy the files.
 * @link https://nextjs.org/docs/advanced-features/source-maps
 */
const disableSourceMaps = process.env.NEXT_DISABLE_SOURCEMAPS === 'true';
if (disableSourceMaps) {
  console.log(
    '[INFO]: Sourcemaps generation have been disabled through NEXT_DISABLE_SOURCEMAPS'
  );
}

// Example of setting up secure headers
// @link https://github.com/jagaapple/next-secure-headers
const { createSecureHeaders } = require('next-secure-headers');
const secureHeaders = createSecureHeaders({
  contentSecurityPolicy: {
    directives: {
      //defaultSrc: "'self'",
      //styleSrc: ["'self'"],
    },
  },
  ...(isProd
    ? {
        forceHTTPSRedirect: [
          true,
          { maxAge: 60 * 60 * 24 * 4, includeSubDomains: true },
        ],
      }
    : {}),
  referrerPolicy: 'same-origin',
});

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  target: NEXTJS_BUILD_TARGET,
  reactStrictMode: true,
  // @ts-ignore
  webpack5: true,
  productionBrowserSourceMaps: !disableSourceMaps,
  i18n,
  optimizeFonts: true,

  httpAgentOptions: {
    // @link https://nextjs.org/blog/next-11-1#builds--data-fetching
    keepAlive: true,
  },

  experimental: {
    // Prefer loading of ES Modules over CommonJS
    // @link https://nextjs.org/blog/next-11-1#es-modules-support
    esmExternals: false,
    // Experimental monorepo support
    // @link https://github.com/vercel/next.js/pull/22867
    // @link https://github.com/vercel/next.js/discussions/26420
    externalDir: true,
  },

  // @link https://nextjs.org/docs/basic-features/image-optimization
  // @ts-ignore
  images: {
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    disableStaticImages: false,
    loader: 'default',
    // Allowed domains for next/image
    domains: ['source.unsplash.com'],
  },

  eslint: {
    ignoreDuringBuilds: NEXTJS_IGNORE_ESLINT,
    dirs: ['src'],
  },

  async headers() {
    return [{ source: '/(.*)', headers: secureHeaders }];
  },

  // @ts-ignore
  webpack: (config, { defaultLoaders, isServer }) => {
    // A temp workaround for https://github.com/prisma/prisma/issues/6899#issuecomment-849126557
    if (isServer) {
      config.externals.push('_http_common');
    }

    config.module.rules.push({
      test: /\.svg$/,
      issuer: /\.(js|ts)x?$/,
      use: ['@svgr/webpack'],
    });

    return config;
  },
  env: {
    APP_NAME: packageJson.name,
    APP_VERSION: packageJson.version,
    BUILD_TIME: new Date().getTime().toString(10),
    SENTRY_RELEASE: process.env.SENTRY_RELEASE
      ? process.env.SENTRY_RELEASE
      : `${packageJson.name}@${packageJson.version}`,
    NEXT_PUBLIC_SENTRY_DSN: process.env.SENTRY_DSN ?? '',
  },
  serverRuntimeConfig: {
    // to bypass https://github.com/zeit/next.js/issues/8251
    PROJECT_ROOT: __dirname,
  },
};

let config = withNextTranspileModules(nextConfig);

if (process.env.NEXT_DISABLE_SENTRY !== '1') {
  config = withSentryConfig(config, {
    dryRun:
      process.env.NODE_ENV !== 'production' ||
      process.env.NEXT_SENTRY_DRY_RUN === '1',
  });
}

if (process.env.ANALYZE === 'true') {
  // @ts-ignore
  const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: true,
  });
  config = withBundleAnalyzer(config);
}

module.exports = config;
