import type { Config } from './types';

function defineConfig(config: Config) {
  return config;
}


export default defineConfig;
export type { Config, LogLevel, RoutesImportMapOptions, ServerOptions } from './types';
export { defineConfig };

