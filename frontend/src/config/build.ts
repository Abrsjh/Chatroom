// Build optimization utilities and asset management

export interface BuildConfig {
  readonly chunkSizeLimit: number;
  readonly compressionEnabled: boolean;
  readonly treeshakingEnabled: boolean;
  readonly minificationEnabled: boolean;
  readonly sourcemapEnabled: boolean;
}

export interface AssetConfig {
  readonly inlineLimit: number;
  readonly imageOptimization: boolean;
  readonly fontOptimization: boolean;
  readonly staticCaching: boolean;
}

// Build optimization configuration
export const buildConfig: BuildConfig = {
  chunkSizeLimit: 1000, // KB
  compressionEnabled: true,
  treeshakingEnabled: true,
  minificationEnabled: true,
  sourcemapEnabled: process.env.NODE_ENV === 'development'
};

// Asset management configuration
export const assetConfig: AssetConfig = {
  inlineLimit: 4096, // bytes - inline assets smaller than this
  imageOptimization: true,
  fontOptimization: true,
  staticCaching: true
};

// Chunk splitting strategy
export const chunkSplitting = {
  vendor: ['react', 'react-dom', 'react-router-dom'],
  store: ['zustand'],
  ui: ['@/components', '@/styles'],
  utils: ['@/utils', '@/hooks'],
  services: ['@/services']
};

// Asset optimization patterns
export const assetPatterns = {
  images: /\.(png|jpe?g|gif|svg|webp|avif)$/i,
  fonts: /\.(woff2?|eot|ttf|otf)$/i,
  videos: /\.(mp4|webm|ogg|mov)$/i,
  documents: /\.(pdf|doc|docx|txt)$/i
};

// Performance budget thresholds
export const performanceBudget = {
  maxChunkSize: 1000, // KB
  maxAssetSize: 500,  // KB
  maxTotalSize: 5000, // KB
  maxLoadTime: 3000,  // ms
  maxFirstPaint: 1500 // ms
};

// Cache configuration
export const cacheConfig = {
  static: {
    maxAge: 31536000, // 1 year for static assets
    immutable: true
  },
  html: {
    maxAge: 0, // No cache for HTML
    mustRevalidate: true
  },
  api: {
    maxAge: 300, // 5 minutes for API responses
    staleWhileRevalidate: 3600 // 1 hour
  }
};

// Bundle analysis configuration
export const bundleAnalysis = {
  enabled: process.env.ANALYZE_BUNDLE === 'true',
  outputFile: 'bundle-analysis.html',
  openAnalyzer: process.env.NODE_ENV === 'development'
};

// Progressive Web App configuration
export const pwaConfig = {
  enabled: true,
  workboxMode: 'generateSW',
  precacheManifest: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\./,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        networkTimeoutSeconds: 10,
        cacheableResponse: {
          statuses: [0, 200]
        }
      }
    }
  ]
};

// Build optimization utilities
export const buildUtils = {
  // Check if chunk should be split
  shouldSplitChunk: (id: string): string | null => {
    if (id.includes('node_modules')) {
      if (chunkSplitting.vendor.some(pkg => id.includes(pkg))) {
        return 'vendor';
      }
      if (chunkSplitting.store.some(pkg => id.includes(pkg))) {
        return 'store';
      }
      return 'vendor';
    }
    
    if (id.includes('components') || id.includes('styles')) {
      return 'ui';
    }
    
    if (id.includes('utils') || id.includes('hooks')) {
      return 'utils';
    }
    
    if (id.includes('services')) {
      return 'services';
    }
    
    return null;
  },

  // Get asset optimization options
  getAssetOptions: (filename: string) => {
    if (assetPatterns.images.test(filename)) {
      return {
        quality: 85,
        progressive: true,
        optimizationLevel: 7
      };
    }
    
    if (assetPatterns.fonts.test(filename)) {
      return {
        preload: true,
        display: 'swap'
      };
    }
    
    return {};
  },

  // Calculate performance score
  calculatePerformanceScore: (metrics: {
    chunkSize: number;
    assetSize: number;
    totalSize: number;
    loadTime: number;
    firstPaint: number;
  }): number => {
    const scores = [
      Math.max(0, 100 - (metrics.chunkSize / performanceBudget.maxChunkSize) * 100),
      Math.max(0, 100 - (metrics.assetSize / performanceBudget.maxAssetSize) * 100),
      Math.max(0, 100 - (metrics.totalSize / performanceBudget.maxTotalSize) * 100),
      Math.max(0, 100 - (metrics.loadTime / performanceBudget.maxLoadTime) * 100),
      Math.max(0, 100 - (metrics.firstPaint / performanceBudget.maxFirstPaint) * 100)
    ];
    
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }
};

export default {
  buildConfig,
  assetConfig,
  chunkSplitting,
  assetPatterns,
  performanceBudget,
  cacheConfig,
  bundleAnalysis,
  pwaConfig,
  buildUtils
};