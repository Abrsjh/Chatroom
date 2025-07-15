// Environment variable configuration and type definitions

export interface EnvironmentConfig {
  readonly apiUrl: string;
  readonly appTitle: string;
  readonly environment: 'development' | 'production' | 'test';
  readonly isDevelopment: boolean;
  readonly isProduction: boolean;
  readonly isTest: boolean;
}

// Helper function to get environment variable with fallback
const getEnvVar = (key: string, fallback: string): string => {
  const value = import.meta.env[key];
  return value !== undefined ? value : fallback;
};

// Environment configuration
export const env: EnvironmentConfig = {
  apiUrl: getEnvVar('VITE_API_URL', 'http://localhost:8000'),
  appTitle: getEnvVar('VITE_APP_TITLE', 'Reddit Forum'),
  environment: getEnvVar('VITE_ENVIRONMENT', 'development') as 'development' | 'production' | 'test',
  get isDevelopment() {
    return this.environment === 'development';
  },
  get isProduction() {
    return this.environment === 'production';
  },
  get isTest() {
    return this.environment === 'test';
  }
};

// Validate required environment variables
const validateEnvironment = (): void => {
  const requiredVars = [
    'VITE_API_URL',
    'VITE_APP_TITLE',
    'VITE_ENVIRONMENT'
  ];

  const missing = requiredVars.filter(varName => 
    !import.meta.env[varName] && !getEnvVar(varName, '')
  );

  if (missing.length > 0) {
    console.warn(`Missing environment variables: ${missing.join(', ')}`);
    console.warn('Using fallback values. For production, ensure all environment variables are set.');
  }
};

// Run validation in development
if (env.isDevelopment) {
  validateEnvironment();
}

// Export for use in application
export default env;