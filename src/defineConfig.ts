import type { UseEnv, UserConfig } from './types';

function defineConfig(config: UserConfig): UserConfig {
  return config;
}

const USE_ENV: UseEnv = 'USE_ENV';


export { defineConfig, USE_ENV };
export default defineConfig;
export type { UserConfig as Config, LogLevel, UseEnv } from './types';

