import { describe, it, expect, beforeEach } from '@jest/globals';

describe('Build Configuration', () => {
  beforeEach(() => {
    // Reset environment
    delete process.env.NODE_ENV;
    delete process.env.ANALYZE_BUNDLE;
  });

  describe('buildConfig', () => {
    it('should have default chunk size limit', async () => {
      const { buildConfig } = await import('../build');
      expect(buildConfig.chunkSizeLimit).toBe(1000);
    });

    it('should enable compression by default', async () => {
      const { buildConfig } = await import('../build');
      expect(buildConfig.compressionEnabled).toBe(true);
    });

    it('should enable treeshaking by default', async () => {
      const { buildConfig } = await import('../build');
      expect(buildConfig.treeshakingEnabled).toBe(true);
    });

    it('should enable minification by default', async () => {
      const { buildConfig } = await import('../build');
      expect(buildConfig.minificationEnabled).toBe(true);
    });

    it('should enable sourcemap in development', async () => {
      process.env.NODE_ENV = 'development';
      const { buildConfig } = await import('../build');
      expect(buildConfig.sourcemapEnabled).toBe(true);
    });

    it('should disable sourcemap in production', async () => {
      process.env.NODE_ENV = 'production';
      const { buildConfig } = await import('../build');
      expect(buildConfig.sourcemapEnabled).toBe(false);
    });
  });

  describe('assetConfig', () => {
    it('should have default inline limit', async () => {
      const { assetConfig } = await import('../build');
      expect(assetConfig.inlineLimit).toBe(4096);
    });

    it('should enable image optimization', async () => {
      const { assetConfig } = await import('../build');
      expect(assetConfig.imageOptimization).toBe(true);
    });

    it('should enable font optimization', async () => {
      const { assetConfig } = await import('../build');
      expect(assetConfig.fontOptimization).toBe(true);
    });

    it('should enable static caching', async () => {
      const { assetConfig } = await import('../build');
      expect(assetConfig.staticCaching).toBe(true);
    });
  });

  describe('chunkSplitting', () => {
    it('should define vendor chunk with React libraries', async () => {
      const { chunkSplitting } = await import('../build');
      expect(chunkSplitting.vendor).toContain('react');
      expect(chunkSplitting.vendor).toContain('react-dom');
      expect(chunkSplitting.vendor).toContain('react-router-dom');
    });

    it('should define store chunk with Zustand', async () => {
      const { chunkSplitting } = await import('../build');
      expect(chunkSplitting.store).toContain('zustand');
    });

    it('should define UI chunk for components and styles', async () => {
      const { chunkSplitting } = await import('../build');
      expect(chunkSplitting.ui).toContain('@/components');
      expect(chunkSplitting.ui).toContain('@/styles');
    });
  });

  describe('assetPatterns', () => {
    it('should match image file extensions', async () => {
      const { assetPatterns } = await import('../build');
      expect(assetPatterns.images.test('image.png')).toBe(true);
      expect(assetPatterns.images.test('image.jpg')).toBe(true);
      expect(assetPatterns.images.test('image.svg')).toBe(true);
      expect(assetPatterns.images.test('image.webp')).toBe(true);
      expect(assetPatterns.images.test('script.js')).toBe(false);
    });

    it('should match font file extensions', async () => {
      const { assetPatterns } = await import('../build');
      expect(assetPatterns.fonts.test('font.woff2')).toBe(true);
      expect(assetPatterns.fonts.test('font.ttf')).toBe(true);
      expect(assetPatterns.fonts.test('image.png')).toBe(false);
    });

    it('should match video file extensions', async () => {
      const { assetPatterns } = await import('../build');
      expect(assetPatterns.videos.test('video.mp4')).toBe(true);
      expect(assetPatterns.videos.test('video.webm')).toBe(true);
      expect(assetPatterns.videos.test('image.png')).toBe(false);
    });
  });

  describe('performanceBudget', () => {
    it('should define reasonable performance thresholds', async () => {
      const { performanceBudget } = await import('../build');
      expect(performanceBudget.maxChunkSize).toBe(1000);
      expect(performanceBudget.maxAssetSize).toBe(500);
      expect(performanceBudget.maxTotalSize).toBe(5000);
      expect(performanceBudget.maxLoadTime).toBe(3000);
      expect(performanceBudget.maxFirstPaint).toBe(1500);
    });
  });

  describe('cacheConfig', () => {
    it('should configure long-term caching for static assets', async () => {
      const { cacheConfig } = await import('../build');
      expect(cacheConfig.static.maxAge).toBe(31536000);
      expect(cacheConfig.static.immutable).toBe(true);
    });

    it('should configure no caching for HTML', async () => {
      const { cacheConfig } = await import('../build');
      expect(cacheConfig.html.maxAge).toBe(0);
      expect(cacheConfig.html.mustRevalidate).toBe(true);
    });

    it('should configure short-term caching for API', async () => {
      const { cacheConfig } = await import('../build');
      expect(cacheConfig.api.maxAge).toBe(300);
      expect(cacheConfig.api.staleWhileRevalidate).toBe(3600);
    });
  });

  describe('bundleAnalysis', () => {
    it('should disable bundle analysis by default', async () => {
      const { bundleAnalysis } = await import('../build');
      expect(bundleAnalysis.enabled).toBe(false);
    });

    it('should enable bundle analysis when environment variable is set', async () => {
      process.env.ANALYZE_BUNDLE = 'true';
      const { bundleAnalysis } = await import('../build');
      expect(bundleAnalysis.enabled).toBe(true);
    });

    it('should open analyzer in development', async () => {
      process.env.NODE_ENV = 'development';
      const { bundleAnalysis } = await import('../build');
      expect(bundleAnalysis.openAnalyzer).toBe(true);
    });
  });

  describe('buildUtils', () => {
    describe('shouldSplitChunk', () => {
      it('should split vendor chunks for React libraries', async () => {
        const { buildUtils } = await import('../build');
        expect(buildUtils.shouldSplitChunk('node_modules/react/index.js')).toBe('vendor');
        expect(buildUtils.shouldSplitChunk('node_modules/react-dom/index.js')).toBe('vendor');
        expect(buildUtils.shouldSplitChunk('node_modules/react-router-dom/index.js')).toBe('vendor');
      });

      it('should split store chunks for Zustand', async () => {
        const { buildUtils } = await import('../build');
        expect(buildUtils.shouldSplitChunk('node_modules/zustand/index.js')).toBe('store');
      });

      it('should split UI chunks for components and styles', async () => {
        const { buildUtils } = await import('../build');
        expect(buildUtils.shouldSplitChunk('src/components/Button.tsx')).toBe('ui');
        expect(buildUtils.shouldSplitChunk('src/styles/global.css')).toBe('ui');
      });

      it('should split utils chunks for utilities and hooks', async () => {
        const { buildUtils } = await import('../build');
        expect(buildUtils.shouldSplitChunk('src/utils/helpers.ts')).toBe('utils');
        expect(buildUtils.shouldSplitChunk('src/hooks/useAuth.ts')).toBe('utils');
      });

      it('should split services chunks for service modules', async () => {
        const { buildUtils } = await import('../build');
        expect(buildUtils.shouldSplitChunk('src/services/api.ts')).toBe('services');
      });

      it('should return null for unknown chunks', async () => {
        const { buildUtils } = await import('../build');
        expect(buildUtils.shouldSplitChunk('src/unknown/module.ts')).toBeNull();
      });
    });

    describe('getAssetOptions', () => {
      it('should return image optimization options for images', async () => {
        const { buildUtils } = await import('../build');
        const options = buildUtils.getAssetOptions('image.png');
        expect(options.quality).toBe(85);
        expect(options.progressive).toBe(true);
        expect(options.optimizationLevel).toBe(7);
      });

      it('should return font optimization options for fonts', async () => {
        const { buildUtils } = await import('../build');
        const options = buildUtils.getAssetOptions('font.woff2');
        expect(options.preload).toBe(true);
        expect(options.display).toBe('swap');
      });

      it('should return empty options for unknown assets', async () => {
        const { buildUtils } = await import('../build');
        const options = buildUtils.getAssetOptions('script.js');
        expect(Object.keys(options)).toHaveLength(0);
      });
    });

    describe('calculatePerformanceScore', () => {
      it('should return perfect score for optimal metrics', async () => {
        const { buildUtils } = await import('../build');
        const score = buildUtils.calculatePerformanceScore({
          chunkSize: 0,
          assetSize: 0,
          totalSize: 0,
          loadTime: 0,
          firstPaint: 0
        });
        expect(score).toBe(100);
      });

      it('should return zero score for worst metrics', async () => {
        const { buildUtils } = await import('../build');
        const score = buildUtils.calculatePerformanceScore({
          chunkSize: 2000,
          assetSize: 1000,
          totalSize: 10000,
          loadTime: 6000,
          firstPaint: 3000
        });
        expect(score).toBe(0);
      });

      it('should return middle score for average metrics', async () => {
        const { buildUtils } = await import('../build');
        const score = buildUtils.calculatePerformanceScore({
          chunkSize: 500,
          assetSize: 250,
          totalSize: 2500,
          loadTime: 1500,
          firstPaint: 750
        });
        expect(score).toBe(50);
      });
    });
  });
});