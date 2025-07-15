import { describe, it, expect, beforeEach } from '@jest/globals';
import { defineConfig, loadEnv } from 'vite';
import type { UserConfig } from 'vite';

// Mock the actual vite config
const createViteConfig = (mode: string): UserConfig => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return defineConfig({
    plugins: [/* react plugin */],
    server: {
      port: 3000,
      host: true
    },
    build: {
      outDir: 'dist',
      sourcemap: mode === 'development',
      minify: mode === 'production' ? 'terser' : false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            store: ['zustand']
          }
        }
      },
      target: 'es2015',
      chunkSizeWarningLimit: 1000
    },
    define: {
      'process.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || 'http://localhost:8000'),
      'process.env.VITE_APP_TITLE': JSON.stringify(env.VITE_APP_TITLE || 'Reddit Forum'),
      'process.env.VITE_ENVIRONMENT': JSON.stringify(mode)
    },
    resolve: {
      alias: {
        '@': '/src'
      }
    }
  });
};

describe('Vite Production Configuration', () => {
  describe('build optimization', () => {
    it('should enable terser minification for production', () => {
      const config = createViteConfig('production');
      expect(config.build?.minify).toBe('terser');
    });

    it('should disable sourcemap for production', () => {
      const config = createViteConfig('production');
      expect(config.build?.sourcemap).toBe(false);
    });

    it('should enable sourcemap for development', () => {
      const config = createViteConfig('development');
      expect(config.build?.sourcemap).toBe(true);
    });

    it('should configure chunk splitting for vendor libraries', () => {
      const config = createViteConfig('production');
      const manualChunks = config.build?.rollupOptions?.output?.manualChunks as Record<string, string[]>;
      
      expect(manualChunks).toBeDefined();
      expect(manualChunks.vendor).toContain('react');
      expect(manualChunks.vendor).toContain('react-dom');
      expect(manualChunks.vendor).toContain('react-router-dom');
      expect(manualChunks.store).toContain('zustand');
    });

    it('should set chunk size warning limit', () => {
      const config = createViteConfig('production');
      expect(config.build?.chunkSizeWarningLimit).toBe(1000);
    });

    it('should target es2015 for broad browser support', () => {
      const config = createViteConfig('production');
      expect(config.build?.target).toBe('es2015');
    });
  });

  describe('environment variables', () => {
    it('should define API URL from environment', () => {
      const config = createViteConfig('production');
      expect(config.define?.['process.env.VITE_API_URL']).toBeDefined();
    });

    it('should define app title from environment', () => {
      const config = createViteConfig('production');
      expect(config.define?.['process.env.VITE_APP_TITLE']).toBeDefined();
    });

    it('should define environment mode', () => {
      const config = createViteConfig('production');
      expect(config.define?.['process.env.VITE_ENVIRONMENT']).toBe('"production"');
    });
  });

  describe('path resolution', () => {
    it('should configure @ alias for src directory', () => {
      const config = createViteConfig('production');
      expect(config.resolve?.alias).toEqual({
        '@': '/src'
      });
    });
  });

  describe('server configuration', () => {
    it('should maintain development server configuration', () => {
      const config = createViteConfig('development');
      expect(config.server?.port).toBe(3000);
      expect(config.server?.host).toBe(true);
    });
  });
});

describe('Environment Configuration', () => {
  describe('production environment', () => {
    it('should use production API URL when available', () => {
      process.env.VITE_API_URL = 'https://api.reddit-forum.com';
      const config = createViteConfig('production');
      expect(config.define?.['process.env.VITE_API_URL']).toBe('"https://api.reddit-forum.com"');
    });

    it('should use production app title when available', () => {
      process.env.VITE_APP_TITLE = 'Community Forum';
      const config = createViteConfig('production');
      expect(config.define?.['process.env.VITE_APP_TITLE']).toBe('"Community Forum"');
    });
  });

  describe('development environment', () => {
    it('should use local API URL as fallback', () => {
      delete process.env.VITE_API_URL;
      const config = createViteConfig('development');
      expect(config.define?.['process.env.VITE_API_URL']).toBe('"http://localhost:8000"');
    });

    it('should use default app title as fallback', () => {
      delete process.env.VITE_APP_TITLE;
      const config = createViteConfig('development');
      expect(config.define?.['process.env.VITE_APP_TITLE']).toBe('"Reddit Forum"');
    });
  });
});