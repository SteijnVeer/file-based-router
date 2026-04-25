import { Router } from 'express';
import { readdirSync, writeFileSync } from 'fs';
import { dirname, relative, resolve as resolvePath } from 'path';
import { METHODS } from './constant';
import { importFile, joinApiPaths, joinFilePaths, makeForwardSlashes, parseApiPathPartFromPathSegment } from './path';

interface RouteFile {
  apiPath: string;
  filePath: string;
}

function getFbrFilePath(rootDir: string): string {
  return joinFilePaths(rootDir, '_fbr.js');
}

function scanDirectory(dirName: string, parentDirPath: string, parentApiPath: string): RouteFile[] {
  const dirPath = joinFilePaths(parentDirPath, dirName);
  const apiPath = joinApiPaths(parentApiPath, parseApiPathPartFromPathSegment(dirName, false));
  return readdirSync(dirPath, { withFileTypes: true })
    .flatMap(entry => entry.isDirectory()
      ? scanDirectory(entry.name, dirPath, apiPath)
      : [{
          filePath: joinFilePaths(dirPath, entry.name),
          apiPath: joinApiPaths(apiPath, parseApiPathPartFromPathSegment(entry.name, true)),
        }]
    );
}

function findAllFiles(rootDir: string): RouteFile[] {
  return scanDirectory('', rootDir, '/');
}

async function writeFbrFile(rootDir: string): Promise<string> {
  const fbrFilePath = getFbrFilePath(rootDir);
  const fbrDir = dirname(fbrFilePath);

  interface RouteEntry {
    importPath: string;
    apiPath: string;
    handlers: { method: string; exportKey: string; isArray: boolean }[];
  }

  const entries: RouteEntry[] = [];

  for (const { filePath, apiPath } of findAllFiles(rootDir)) {
    let mod: any;
    try {
      mod = await importFile(filePath);
    } catch (err) {
      log.warn(`Could not import route file "${filePath}" during build: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }
    const handlers: RouteEntry['handlers'] = [];
    for (const [method, exportKey] of Object.entries(METHODS)) {
      const raw = mod[exportKey];
      if (!raw) continue;
      if (Array.isArray(raw) || typeof raw === 'function')
        handlers.push({ method, exportKey, isArray: Array.isArray(raw) });
    }
    if (handlers.length > 0)
      entries.push({
        importPath: './' + makeForwardSlashes(relative(fbrDir, filePath)),
        apiPath,
        handlers,
      });
  }

  const lines: string[] = ["import { Router } from 'express';"];

  for (let i = 0; i < entries.length; i++) {
    const { importPath, handlers } = entries[i];
    const named = handlers.map(({ exportKey }) => `${exportKey} as R${i}_${exportKey}`).join(', ');
    lines.push(`import { ${named} } from '${importPath}';`);
  }

  if (entries.length === 0) {
    lines.push('export default Router();');
  } else {
    lines.push('export default Router()');
    const chains: string[] = [];
    for (let i = 0; i < entries.length; i++) {
      const { apiPath, handlers } = entries[i];
      for (const { method, exportKey, isArray } of handlers) {
        const ref = `R${i}_${exportKey}`;
        chains.push(`  .${method}('${apiPath}', ${isArray ? `...${ref}` : ref})`);
      }
    }
    chains[chains.length - 1] += ';';
    lines.push(...chains);
  }

  writeFileSync(fbrFilePath, lines.join('\n'), 'utf-8');
  return fbrFilePath;
}

async function createRouterFromDirectory(rootDir: string): Promise<Router> {
  const router = Router();
  for (const { filePath, apiPath } of findAllFiles(rootDir)) {
    let mod: any;
    try {
      mod = await importFile(filePath);
    } catch (err) {
      log.warn(`Could not import route file "${filePath}": ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }
    for (const [method, methodKey] of Object.entries(METHODS)) {
      const raw = mod[methodKey];
      if (raw === undefined)
        continue;
      if (Array.isArray(raw)) {
        const handlers = raw.filter((h: any) => typeof h === 'function');
        if (handlers.length < raw.length)
          log.warn(`Route "${filePath}" — export "${methodKey}" contains non-function entries, they will be ignored.`);
        if (handlers.length)
          // @ts-expect-error
          router[method](apiPath, ...handlers);
      } else if (typeof raw === 'function')
        // @ts-expect-error
        router[method](apiPath, raw);
      else
        log.warn(`Route "${filePath}" — export "${methodKey}" is not a function or array of functions, skipping.`);
    }
  }
  return router;
}

async function getRouter(): Promise<Router> {
  if (Fbr.isDev) {
    const rootDir = resolvePath(Fbr.config.paths.srcDir, Fbr.config.router.routesDir);
    return createRouterFromDirectory(rootDir);
  } else {
    const rootDir = resolvePath(Fbr.config.paths.buildDir, Fbr.config.router.routesDir);
    const fbrModule = await importFile(getFbrFilePath(rootDir));
    return fbrModule.default;
  }
}


export default getRouter;
export { getRouter, writeFbrFile };

