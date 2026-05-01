import type { UserConfig } from '../types';

function defineConfig(config: UserConfig): UserConfig {
  return config;
}


export { USE_ENV } from '../core/constant';
export { defineConfig };
export default defineConfig;
export type { UserConfig as Config, LogLevel, UseEnv } from '../types';

