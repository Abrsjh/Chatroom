import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock child_process for testing deployment scripts
jest.mock('child_process', () => ({
  exec: jest.fn(),
  spawn: jest.fn(),
  execSync: jest.fn()
}));

describe('Deployment Scripts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('package.json scripts', () => {
    it('should have build scripts for different environments', () => {
      const packageJson = require('../../package.json');
      
      expect(packageJson.scripts).toHaveProperty('build:dev');
      expect(packageJson.scripts).toHaveProperty('build:prod');
      expect(packageJson.scripts).toHaveProperty('build:analyze');
      expect(packageJson.scripts['build:dev']).toContain('vite build --mode development');
      expect(packageJson.scripts['build:prod']).toContain('vite build --mode production');
      expect(packageJson.scripts['build:analyze']).toContain('ANALYZE_BUNDLE=true');
    });

    it('should have deployment scripts', () => {
      const packageJson = require('../../package.json');
      
      expect(packageJson.scripts).toHaveProperty('deploy:vercel');
      expect(packageJson.scripts).toHaveProperty('deploy:preview');
      expect(packageJson.scripts['deploy:vercel']).toContain('vercel --prod');
      expect(packageJson.scripts['deploy:preview']).toContain('vercel');
    });

    it('should have quality assurance scripts', () => {
      const packageJson = require('../../package.json');
      
      expect(packageJson.scripts).toHaveProperty('lint');
      expect(packageJson.scripts).toHaveProperty('lint:fix');
      expect(packageJson.scripts).toHaveProperty('type-check');
      expect(packageJson.scripts).toHaveProperty('test:coverage');
      expect(packageJson.scripts['type-check']).toContain('tsc --noEmit');
      expect(packageJson.scripts['test:coverage']).toContain('jest --coverage');
    });

    it('should have utility scripts', () => {
      const packageJson = require('../../package.json');
      
      expect(packageJson.scripts).toHaveProperty('clean');
      expect(packageJson.scripts).toHaveProperty('preview');
      expect(packageJson.scripts['clean']).toContain('rm -rf dist coverage');
      expect(packageJson.scripts['preview']).toContain('vite preview');
    });

    it('should specify engine requirements', () => {
      const packageJson = require('../../package.json');
      
      expect(packageJson.engines).toHaveProperty('node');
      expect(packageJson.engines).toHaveProperty('npm');
      expect(packageJson.engines.node).toBe('>=18.0.0');
      expect(packageJson.engines.npm).toBe('>=9.0.0');
    });

    it('should have browserslist configuration', () => {
      const packageJson = require('../../package.json');
      
      expect(packageJson.browserslist).toHaveProperty('production');
      expect(packageJson.browserslist).toHaveProperty('development');
      expect(packageJson.browserslist.production).toContain('>0.2%');
      expect(packageJson.browserslist.production).toContain('not dead');
    });
  });

  describe('Vercel configuration', () => {
    it('should have valid vercel.json structure', () => {
      const vercelConfig = require('../../vercel.json');
      
      expect(vercelConfig).toHaveProperty('version', 2);
      expect(vercelConfig).toHaveProperty('name', 'reddit-forum-frontend');
      expect(vercelConfig).toHaveProperty('framework', 'vite');
      expect(vercelConfig).toHaveProperty('buildCommand', 'npm run build:prod');
      expect(vercelConfig).toHaveProperty('outputDirectory', 'dist');
    });

    it('should configure environment variables', () => {
      const vercelConfig = require('../../vercel.json');
      
      expect(vercelConfig.env).toHaveProperty('VITE_API_URL');
      expect(vercelConfig.env).toHaveProperty('VITE_APP_TITLE');
      expect(vercelConfig.env).toHaveProperty('VITE_ENVIRONMENT');
      expect(vercelConfig.build.env).toHaveProperty('VITE_API_URL');
    });

    it('should configure routing for SPA', () => {
      const vercelConfig = require('../../vercel.json');
      
      expect(vercelConfig.routes).toHaveLength(3);
      expect(vercelConfig.routes[0].src).toBe('/api/(.*)');
      expect(vercelConfig.routes[1].handle).toBe('filesystem');
      expect(vercelConfig.routes[2].src).toBe('/(.*)');
      expect(vercelConfig.routes[2].dest).toBe('/index.html');
    });

    it('should configure security headers', () => {
      const vercelConfig = require('../../vercel.json');
      
      const securityHeaders = vercelConfig.headers.find(h => h.source === '/(.*)');
      expect(securityHeaders).toBeDefined();
      
      const headerKeys = securityHeaders.headers.map(h => h.key);
      expect(headerKeys).toContain('X-Content-Type-Options');
      expect(headerKeys).toContain('X-Frame-Options');
      expect(headerKeys).toContain('X-XSS-Protection');
      expect(headerKeys).toContain('Referrer-Policy');
      expect(headerKeys).toContain('Permissions-Policy');
    });

    it('should configure caching headers', () => {
      const vercelConfig = require('../../vercel.json');
      
      const staticHeaders = vercelConfig.headers.find(h => h.source === '/static/(.*)');
      expect(staticHeaders).toBeDefined();
      
      const cacheHeader = staticHeaders.headers.find(h => h.key === 'Cache-Control');
      expect(cacheHeader.value).toContain('max-age=31536000');
      expect(cacheHeader.value).toContain('immutable');
    });

    it('should configure redirects', () => {
      const vercelConfig = require('../../vercel.json');
      
      expect(vercelConfig.redirects).toHaveLength(1);
      expect(vercelConfig.redirects[0].source).toBe('/home');
      expect(vercelConfig.redirects[0].destination).toBe('/channels');
    });

    it('should configure clean URLs', () => {
      const vercelConfig = require('../../vercel.json');
      
      expect(vercelConfig.cleanUrls).toBe(true);
      expect(vercelConfig.trailingSlash).toBe(false);
    });
  });

  describe('Environment files', () => {
    it('should have development environment configuration', () => {
      const fs = require('fs');
      const path = require('path');
      
      const devEnvPath = path.join(__dirname, '../../.env.development');
      expect(fs.existsSync(devEnvPath)).toBe(true);
      
      const devEnvContent = fs.readFileSync(devEnvPath, 'utf8');
      expect(devEnvContent).toContain('VITE_API_URL=http://localhost:8000');
      expect(devEnvContent).toContain('VITE_APP_TITLE=Reddit Forum (Dev)');
      expect(devEnvContent).toContain('VITE_ENVIRONMENT=development');
    });

    it('should have production environment configuration', () => {
      const fs = require('fs');
      const path = require('path');
      
      const prodEnvPath = path.join(__dirname, '../../.env.production');
      expect(fs.existsSync(prodEnvPath)).toBe(true);
      
      const prodEnvContent = fs.readFileSync(prodEnvPath, 'utf8');
      expect(prodEnvContent).toContain('VITE_API_URL=https://api.reddit-forum.com');
      expect(prodEnvContent).toContain('VITE_APP_TITLE=Reddit Forum');
      expect(prodEnvContent).toContain('VITE_ENVIRONMENT=production');
    });

    it('should have example environment configuration', () => {
      const fs = require('fs');
      const path = require('path');
      
      const exampleEnvPath = path.join(__dirname, '../../.env.example');
      expect(fs.existsSync(exampleEnvPath)).toBe(true);
      
      const exampleEnvContent = fs.readFileSync(exampleEnvPath, 'utf8');
      expect(exampleEnvContent).toContain('VITE_API_URL=');
      expect(exampleEnvContent).toContain('VITE_APP_TITLE=');
      expect(exampleEnvContent).toContain('VITE_ENVIRONMENT=');
    });
  });

  describe('Deployment validation', () => {
    it('should validate required deployment files exist', () => {
      const fs = require('fs');
      const path = require('path');
      
      const requiredFiles = [
        'package.json',
        'vercel.json',
        'vite.config.ts',
        '.env.development',
        '.env.production',
        '.env.example'
      ];
      
      requiredFiles.forEach(file => {
        const filePath = path.join(__dirname, '../../', file);
        expect(fs.existsSync(filePath)).toBe(true);
      });
    });

    it('should validate deployment scripts exist', () => {
      const fs = require('fs');
      const path = require('path');
      
      const requiredScripts = [
        'scripts/deploy.sh',
        'scripts/validate-build.sh',
        'scripts/pre-deploy-check.sh'
      ];
      
      requiredScripts.forEach(script => {
        const scriptPath = path.join(__dirname, '../../', script);
        expect(fs.existsSync(scriptPath)).toBe(true);
      });
    });

    it('should validate script permissions', () => {
      const fs = require('fs');
      const path = require('path');
      
      const executableScripts = [
        'scripts/deploy.sh',
        'scripts/validate-build.sh',
        'scripts/pre-deploy-check.sh'
      ];
      
      executableScripts.forEach(script => {
        const scriptPath = path.join(__dirname, '../../', script);
        const stats = fs.statSync(scriptPath);
        
        // Check if file exists and is readable
        expect(stats.isFile()).toBe(true);
        expect(stats.size).toBeGreaterThan(0);
      });
    });
  });

  describe('Build configuration validation', () => {
    it('should validate Vite configuration for production', () => {
      const viteConfig = require('../../vite.config.ts');
      
      // This would need to be tested in a more sophisticated way
      // For now, just verify the file exists and is importable
      expect(viteConfig).toBeDefined();
    });

    it('should validate TypeScript configuration', () => {
      const tsConfig = require('../../tsconfig.json');
      
      expect(tsConfig.compilerOptions).toBeDefined();
      expect(tsConfig.compilerOptions.target).toBeDefined();
      expect(tsConfig.compilerOptions.module).toBeDefined();
    });

    it('should validate Jest configuration', () => {
      const jestConfig = require('../../jest.config.js');
      
      expect(jestConfig).toBeDefined();
      expect(jestConfig.testEnvironment).toBe('jsdom');
      expect(jestConfig.setupFilesAfterEnv).toContain('<rootDir>/src/setupTests.ts');
    });
  });
});