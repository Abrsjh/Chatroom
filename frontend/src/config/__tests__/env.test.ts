import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock import.meta.env
const mockEnv = {
  VITE_API_URL: 'http://localhost:8000',
  VITE_APP_TITLE: 'Reddit Forum',
  VITE_ENVIRONMENT: 'development'
};

// Mock import.meta
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: mockEnv
    }
  }
});

describe('Environment Configuration', () => {
  beforeEach(() => {
    // Reset environment variables
    mockEnv.VITE_API_URL = 'http://localhost:8000';
    mockEnv.VITE_APP_TITLE = 'Reddit Forum';
    mockEnv.VITE_ENVIRONMENT = 'development';
  });

  afterEach(() => {
    // Clear module cache to ensure fresh imports
    jest.resetModules();
  });

  describe('default values', () => {
    it('should provide default API URL', async () => {
      delete mockEnv.VITE_API_URL;
      const { env } = await import('../config/env');
      expect(env.apiUrl).toBe('http://localhost:8000');
    });

    it('should provide default app title', async () => {
      delete mockEnv.VITE_APP_TITLE;
      const { env } = await import('../config/env');
      expect(env.appTitle).toBe('Reddit Forum');
    });

    it('should provide default environment', async () => {
      delete mockEnv.VITE_ENVIRONMENT;
      const { env } = await import('../config/env');
      expect(env.environment).toBe('development');
    });
  });

  describe('environment detection', () => {
    it('should detect development environment', async () => {
      mockEnv.VITE_ENVIRONMENT = 'development';
      const { env } = await import('../config/env');
      expect(env.isDevelopment).toBe(true);
      expect(env.isProduction).toBe(false);
      expect(env.isTest).toBe(false);
    });

    it('should detect production environment', async () => {
      mockEnv.VITE_ENVIRONMENT = 'production';
      const { env } = await import('../config/env');
      expect(env.isDevelopment).toBe(false);
      expect(env.isProduction).toBe(true);
      expect(env.isTest).toBe(false);
    });

    it('should detect test environment', async () => {
      mockEnv.VITE_ENVIRONMENT = 'test';
      const { env } = await import('../config/env');
      expect(env.isDevelopment).toBe(false);
      expect(env.isProduction).toBe(false);
      expect(env.isTest).toBe(true);
    });
  });

  describe('configuration values', () => {
    it('should use environment API URL when provided', async () => {
      mockEnv.VITE_API_URL = 'https://api.example.com';
      const { env } = await import('../config/env');
      expect(env.apiUrl).toBe('https://api.example.com');
    });

    it('should use environment app title when provided', async () => {
      mockEnv.VITE_APP_TITLE = 'Custom Forum';
      const { env } = await import('../config/env');
      expect(env.appTitle).toBe('Custom Forum');
    });

    it('should use environment mode when provided', async () => {
      mockEnv.VITE_ENVIRONMENT = 'production';
      const { env } = await import('../config/env');
      expect(env.environment).toBe('production');
    });
  });

  describe('validation', () => {
    it('should warn about missing environment variables in development', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      delete mockEnv.VITE_API_URL;
      delete mockEnv.VITE_APP_TITLE;
      mockEnv.VITE_ENVIRONMENT = 'development';
      
      await import('../config/env');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Missing environment variables')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Using fallback values')
      );
      
      consoleSpy.mockRestore();
    });

    it('should not warn in production environment', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      delete mockEnv.VITE_API_URL;
      mockEnv.VITE_ENVIRONMENT = 'production';
      
      await import('../config/env');
      
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('type safety', () => {
    it('should provide readonly configuration', async () => {
      const { env } = await import('../config/env');
      
      // TypeScript should prevent this, but test runtime behavior
      expect(() => {
        (env as any).apiUrl = 'modified';
      }).toThrow();
    });

    it('should provide correct TypeScript types', async () => {
      const { env } = await import('../config/env');
      
      // These should not throw TypeScript errors
      expect(typeof env.apiUrl).toBe('string');
      expect(typeof env.appTitle).toBe('string');
      expect(typeof env.environment).toBe('string');
      expect(typeof env.isDevelopment).toBe('boolean');
      expect(typeof env.isProduction).toBe('boolean');
      expect(typeof env.isTest).toBe('boolean');
    });
  });
});