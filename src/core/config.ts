import { pathToFileURL } from 'url';
import type { Plugin, UserConfig } from '../types';
import { DEFAULT_CONFIG } from './constant';
import { importFile } from './path';

async function tryCatch<T = any, A extends any[] = never>(fn: (...args: A) => Promise<T>, ...args: A): Promise<readonly [T, null] | readonly [null, Error]> {
  try {
    const data = await fn(...args);
    return [data, null] as const;
  } catch (err) {
    const error = err instanceof Error
      ? err
      : new Error(String(err));
    return [null, error] as const;
  }
}
async function importPluginFromHref(pluginHref: string): Promise<Plugin> {
  const pluginModule = await import(pluginHref);
  if (typeof pluginModule.default === 'function')
    return pluginModule.default as Plugin;
  else
    throw new Error(`Plugin module does not export a default function: ${pluginHref}`);
}
async function importPlugin(plugin: string): Promise<Plugin> {
  const [externalPlugin, externalError] = await tryCatch(importPluginFromHref, plugin);
  if (!externalError)
    return externalPlugin;
  const [localPlugin, localError] = await tryCatch(importPluginFromHref, pathToFileURL(plugin).href);
  if (!localError)
    return localPlugin;
  return () => {
    log.error(`Failed to load plugin "${plugin}".`);
  };
}
function toEnvKey(parentKey: string, childKey: string): string {
  const toSnake = (s: string) => s.replace(/([A-Z])/g, '_$1').toUpperCase();
  return `${toSnake(parentKey)}_${toSnake(childKey)}`;
}
function parseEnvValue(value: string): string | string[] | null {
  return value === 'null'
    ? null
    : value.includes(',')
      ? value.split(',').map(v => v.trim())
      : value;
}

type RawConfig = Omit<Fbr.Config, 'plugins'> & { plugins: (Plugin | string)[] };

function resolveEnvValues(config: RawConfig): RawConfig {
  const result = { ...config } as any;
  for (const [parentKey, parentValue] of Object.entries(config)) {
    if (typeof parentValue !== 'object' || parentValue === null || Array.isArray(parentValue))
      continue;
    result[parentKey] = { ...parentValue };
    for (const [childKey, childValue] of Object.entries(parentValue)) {
      if (childValue !== 'USE_ENV')
        continue;
      const envKey = toEnvKey(parentKey, childKey);
      const envValue = process.env[envKey];
      if (envValue !== undefined)
        result[parentKey][childKey] = parseEnvValue(envValue);
      else {
        log.warn(`USE_ENV: no environment variable "${envKey}" set for "${parentKey}.${childKey}", using default.`);
        result[parentKey][childKey] = (DEFAULT_CONFIG as any)[parentKey]?.[childKey];
      }
    }
  }
  return result;
}
function createFullConfig(config: UserConfig = {}): RawConfig {
  const fullConfig = Object.entries(DEFAULT_CONFIG).reduce((acc, [key, value]) => {
    acc[key as keyof Fbr.Config] = typeof value === 'object' && value !== null && !Array.isArray(value)
      ? { ...value, ...config[key as keyof UserConfig] as object }
      : config[key as keyof UserConfig] ?? value;
    return acc;
  }, {} as RawConfig);
  for (const key of Object.keys(config))
    if (!(key in DEFAULT_CONFIG))
      (fullConfig as any)[key] = (config as any)[key];
  return resolveEnvValues(fullConfig);
}

const [parsedConfig, parseError] = await tryCatch(async () => {
  const configModule = await importFile('fbr.config');
  const raw = createFullConfig(configModule.default);
  return { ...raw, plugins: await Promise.all(raw.plugins.map(p => typeof p === 'string' ? importPlugin(p) : p)) };
});
const config = !parseError
  ? parsedConfig
  : (
    log.warn('No fbr.config file found or failed to load, using default configuration.'),
    DEFAULT_CONFIG
  );


export { config };
export default config;

