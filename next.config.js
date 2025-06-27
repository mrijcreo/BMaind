/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  webpack: (config, { isServer, webpack }) => {
    // More comprehensive ignore patterns for pdf-parse
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/test\/.*$/,
        contextRegExp: /pdf-parse/,
      })
    );
    
    // Additional ignore for specific test files
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/test\/data\/05-versions-space\.pdf$/,
        contextRegExp: /pdf-parse/,
      })
    );

    // Externalize pdf-parse for server-side builds
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('pdf-parse');
    }

    // Only apply fallbacks for client-side builds, not server-side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    
    return config;
  }
}

module.exports = nextConfig