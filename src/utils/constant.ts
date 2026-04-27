import type { LogLevel } from '../types';

const LOG_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error', 'none', 'none'] as const;

const METHODS = {
  use: 'ALL',
  get: 'GET',
  post: 'POST',
  put: 'PUT',
  patch: 'PATCH',
  delete: 'DELETE',
  options: 'OPTIONS',
  head: 'HEAD',
} as const;

const DEFAULT_CONFIG: Fbr.Config = {
  logLevel: {
    dev: 'debug',
    prod: 'info',
  },
  paths: {
    buildDir: 'dist',
    srcDir: 'src',
  },
  server: {
    port: 3000,
    hostname: 'localhost',
    allowedOrigins: null,
    staticFilesDir: null,
  },
  router: {
    routesDir: 'routes',
    routesBasePath: '/',
  },
  plugins: [],
};


export { DEFAULT_CONFIG, LOG_LEVELS, METHODS };

