const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.(?:png|jpg|jpeg|svg|gif|webp)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: {
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-cache',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 365 days
        },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-static',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 365 days
        },
      },
    },
    {
      urlPattern: /\/api\/.*\/*.json$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
        networkTimeoutSeconds: 10,
      },
    },
  ],
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Temporarily ignore ESLint errors during build
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Temporarily ignore TypeScript errors during build
    ignoreBuildErrors: true,
  },
  // Skip build-time static generation for API routes
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  experimental: {
    typedRoutes: true,
    optimizePackageImports: [
      'lucide-react', 
      '@radix-ui/react-icons',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      '@radix-ui/react-tooltip',
      'recharts',
      'date-fns',
      'lodash-es'
    ],
    esmExternals: 'loose',
    serverComponentsExternalPackages: [
      '@google-cloud/vision',
      '@google-cloud/documentai',
      'google-auth-library',
      'ioredis'
    ],
  },
  
  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    domains: ['localhost', 'your-domain.com', 'supabase.co'],
    dangerouslyAllowSVG: false,
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
        ],
      },
    ]
  },
  
  // Advanced bundle optimization
  webpack: (config, { dev, isServer, webpack }) => {
    // Exclude Google Cloud client libraries from client-side bundles
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        querystring: false,
        util: false,
        buffer: false,
        events: false,
        child_process: false,
      }
      
      // Exclude server-only libraries from client bundle
      config.externals = config.externals || []
      config.externals.push({
        '@google-cloud/vision': 'commonjs @google-cloud/vision',
        '@google-cloud/documentai': 'commonjs @google-cloud/documentai',
        'google-auth-library': 'commonjs google-auth-library',
        'ioredis': 'commonjs ioredis',
        'sharp': 'commonjs sharp',
      })
    }
    
    // Advanced bundle splitting for production
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000,
        cacheGroups: {
          // Framework chunk (React, Next.js)
          framework: {
            chunks: 'all',
            name: 'framework',
            test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
            priority: 40,
            enforce: true,
          },
          // UI libraries chunk
          ui: {
            name: 'ui-libs',
            test: /[\\/]node_modules[\\/](@radix-ui|lucide-react|framer-motion)[\\/]/,
            chunks: 'all',
            priority: 30,
            enforce: true,
          },
          // Charts and visualization libraries
          charts: {
            name: 'charts',
            test: /[\\/]node_modules[\\/](recharts|d3|victory)[\\/]/,
            chunks: 'all',
            priority: 25,
            enforce: true,
          },
          // Utility libraries
          utils: {
            name: 'utils',
            test: /[\\/]node_modules[\\/](lodash|date-fns|uuid|crypto-js)[\\/]/,
            chunks: 'all',
            priority: 20,
            enforce: true,
          },
          // Supabase and auth libraries
          auth: {
            name: 'auth',
            test: /[\\/]node_modules[\\/](@supabase|jose|jsonwebtoken)[\\/]/,
            chunks: 'all',
            priority: 15,
            enforce: true,
          },
          // Default vendor chunk for remaining node_modules
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
            enforce: true,
          },
          // Common chunks for shared code
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 5,
            enforce: true,
          },
        },
      }
      
      // Tree shaking optimization
      config.optimization.usedExports = true
      config.optimization.sideEffects = false
      
      // Module concatenation
      config.optimization.concatenateModules = true
      
      // Minimize CSS
      const MiniCssExtractPlugin = require('mini-css-extract-plugin')
      config.plugins.push(
        new MiniCssExtractPlugin({
          filename: 'static/css/[contenthash].css',
          chunkFilename: 'static/css/[contenthash].css',
        })
      )
    }
    
    // Analyze bundle if requested
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
          reportFilename: isServer ? '../analyze/server.html' : './analyze/client.html',
        })
      )
    }
    
    // Add webpack plugins for optimization
    config.plugins.push(
      new webpack.DefinePlugin({
        __DEV__: JSON.stringify(dev),
        __SERVER__: JSON.stringify(isServer),
      })
    )
    
    return config
  },
  
  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // Redirects and rewrites
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ]
  },
  
  // Output settings
  // output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  swcMinify: true,
  
  // Logging
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
}

module.exports = process.env.ANALYZE === 'true'
  ? require('@next/bundle-analyzer')()(withPWA(nextConfig))
  : withPWA(nextConfig)