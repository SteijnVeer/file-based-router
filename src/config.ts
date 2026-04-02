import { pathToFileURL } from 'url';
import type { LogLevel } from './log';
import type { FileBasedRouterOptions } from './router';
import type { ServerOptions } from './server';

// helpers
function isRecord(value: any): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
type DeepPartial<T extends Record<string, any>> = {
  [K in keyof T]?: T[K] extends Record<string, any> ? DeepPartial<T[K]> : T[K];
};
function deepAssign<T extends Record<string, any>>(target: T, source: DeepPartial<T>): T {
  for (const key in target)
    if (key in source && source[key] !== undefined)
      if (isRecord(target[key]))
        target[key] = deepAssign(target[key], source[key]);
      else
        target[key] = source[key] as T[typeof key];
  return target;
}

// config
type Config = {
  logLevel: LogLevel;
  server: Omit<ServerOptions, 'routerOptions'>;
  router: FileBasedRouterOptions;
};
type PartialConfig = DeepPartial<Config>;
const CONFIG: Config = {
  logLevel: 'info',
  server: {
    port: 3000,
    hostname: 'localhost',
    allowedOrigins: null,
  },
  router: {
    rootDir: '.\\src\\routes',
    basePath: '/',
    allowedExtensions: ['.ts', '.js'],
  },
} as const;

// main
async function loadConfig(): Promise<Config> {
  try {
    const configModule = await import(pathToFileURL('fbr.config').href);
    const config: PartialConfig = configModule.default;
    return deepAssign({ ...CONFIG }, config);
  } catch (error) {
    console.error(`Error loading configuration: ${error instanceof Error ? error.stack : String(error)}`);
    process.exit(1);
  }
}


export { loadConfig };
export type { Config, PartialConfig };

