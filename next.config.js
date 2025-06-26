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

    // Fallback for missing files in pdf-parse
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    };
    
    return config;
  },
  // Updated configuration for Next.js 15
  serverExternalPackages: ['pdf-parse']
}

module.exports = nextConfig