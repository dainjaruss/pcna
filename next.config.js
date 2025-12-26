/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  // Transpile modern ESM packages that use newer syntax (like `undici`/`cheerio`)
  // so Next's build (SWC/webpack) can process them.
  transpilePackages: ['cheerio', 'undici'],
  output: 'standalone',
}

module.exports = nextConfig

// Treat certain modern ESM packages as externals during server webpack builds
// so webpack doesn't attempt to parse unsupported syntax from those packages.
module.exports.webpack = (config, { isServer }) => {
  if (isServer) {
    config.externals = config.externals || [];
    config.externals.push(/undici/, /cheerio/);
  }
  return config;
};
