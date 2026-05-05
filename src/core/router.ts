import { Router } from 'express';
import { writeFileSync } from 'fs';
import { resolve as resolvePath } from 'path';
import findFiles from '../utils/findFiles';
import { METHODS } from './constant';
import { createApiPathFromPathParts, createFilePathFromPathParts, importFile, joinFilePaths } from './path';

function getFbrFilePath(rootDir: string): string {
  return joinFilePaths(rootDir, '__fbr__.js');
}

async function writeFbrFile(rootDir: string): Promise<string> {
  const files = await findFiles.import<Partial<Record<typeof METHODS[keyof typeof METHODS], Fbr.RouteFileExport>>>(rootDir);
  const entries = files.map(({ mod, href, paths }) => {
    if (!mod) {
      log.error(`Route ${href}\n - failed to import during build`);
      throw new Error(`Failed to import route file "${href}" during build.`);
    }
    const methods: { method: string; METHOD: string; isArray: boolean }[] = [];
    for (const [method, METHOD] of Object.entries(METHODS)) {
      const raw = mod[METHOD];
      if (raw === undefined)
        continue;
      if (Array.isArray(raw)) {
        const handlers = raw.filter((h: any) => typeof h === 'function');
        if (!handlers.length) {
          log.error(`Route "${href}"\n — export "${METHOD}" is an array but contains no functions, which is not allowed during build.`);
          throw new Error(`Export "${METHOD}" in route file "${href}" is an array but contains no functions, which is not allowed during build.`);
        }
        if (handlers.length < raw.length) {
          log.error(`Route "${href}"\n — export "${METHOD}" contains non-function entries, which is not allowed during build.`);
          throw new Error(`Export "${METHOD}" in route file "${href}" contains non-function entries, which is not allowed during build.`);
        }
        methods.push({ method, METHOD, isArray: true });
      } else if (typeof raw === 'function')
        methods.push({ method, METHOD, isArray: false });
      else {
        log.error(`Route "${href}"\n — export "${METHOD}" is not a function or array of functions, which is not allowed during build.`);
        throw new Error(`Export "${METHOD}" in route file "${href}" is not a function or array of functions, which is not allowed during build.`);
      }
    }
    return {
      filePath: createFilePathFromPathParts(paths),
      apiPath: createApiPathFromPathParts(paths),
      methods,
    };
  });
  let imports = "import{Router}from'express';";
  let exports = 'export default Router()';
  entries.forEach(({ filePath, methods, apiPath }, index) => {
    const named: string[] = [];
    methods.forEach(({ METHOD, method, isArray }) => {
      const ref = `R${index}_${METHOD}`;
      named.push(`${METHOD} as ${ref}`);
      exports += `.${method}('${apiPath}', ${isArray ? '...' : ''}${ref})`;
    });
    imports += `import{${named.join(',')}}from'${filePath}';`;
  });
  const fbrFilePath = getFbrFilePath(rootDir);
  writeFileSync(fbrFilePath, `${imports}${exports};`, 'utf-8');
  return fbrFilePath;
}

async function createRouterFromDirectory(rootDir: string): Promise<Router> {
  const router = Router();
  const files = await findFiles.import<Partial<Record<typeof METHODS[keyof typeof METHODS], Fbr.RouteFileExport>>>(rootDir);
  files.forEach(({ mod, href, paths }) => {
    if (!mod) {
      log.warn(`Route ${href}\n - failed to import`);
      return;
    }
    const apiPath = createApiPathFromPathParts(paths);
    for (const [method, METHOD] of Object.entries(METHODS) as [keyof typeof METHODS, typeof METHODS[keyof typeof METHODS]][]) {
      const raw = mod[METHOD];
      if (raw === undefined)
        continue;
      if (Array.isArray(raw)) {
        const handlers = raw.filter((h: any) => typeof h === 'function');
        if (handlers.length < raw.length)
          log.warn(`Route "${href}"\n — export "${METHOD}" contains non-function entries, they will be ignored.`);
        if (handlers.length)
          router[method](apiPath, ...handlers);
      } else if (typeof raw === 'function')
        router[method](apiPath, raw);
      else
        log.warn(`Route "${href}" — export "${METHOD}" is not a function or array of functions, skipping.`);
    }
  });
  return router;
}

async function getRouter(): Promise<Router> {
  if (Fbr.isDev)
    return createRouterFromDirectory(resolvePath(Fbr.config.paths.srcDir, Fbr.config.router.routesDir));
  else
    return (await importFile(getFbrFilePath(resolvePath(Fbr.config.paths.buildDir, Fbr.config.router.routesDir)))).default;
}


export default getRouter;
export { createRouterFromDirectory, getFbrFilePath, getRouter, writeFbrFile };

