import cookieParser from 'cookie-parser';
import cors from 'cors';
import type { NextFunction, Request, Response } from 'express';
import express, { Router } from 'express';
import { existsSync, readdirSync, writeFileSync } from 'fs';
import { createServer as createHttpServer } from 'http';
import { extname, join, relative } from 'path';
import { pathToFileURL } from 'url';
import type { Config, Log, LogLevel, RoutesImportItem, RoutesImportMap, RoutesImportMapDefault, RoutesImportMapOptions, Server, ServerOptions } from './types';

// log
const LOG_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error', 'none', 'none'] as const;
const log: Log = (message: string, level: LogLevel = 'info') => {
  if (LOG_LEVELS.indexOf(level) >= LOG_LEVELS.lastIndexOf(log._level)) {
    const prefix = `[${level.toUpperCase()}] `;
    process.stdout.write(`${prefix}${message.split('\n').join(`\n${prefix}`)}\n`);
  }
};
log._level = 'info';
log.level = ((level?: LogLevel) => {
  if (!level)
    return log._level;
  if (!LOG_LEVELS.includes(level))
    throw new Error(`Invalid log level: ${level}`);
  log._level = level;
}) as typeof log.level;
log.debug = (message) => log(message, 'debug');
log.info = (message) => log(message, 'info');
log.warn = (message) => log(message, 'warn');
log.error = (message, error) => log(message + (error ? `\n${error instanceof Error ? error.stack : String(error)}` : ''), 'error');
global.log = log;

// path
function removeOrderingPrefix(name: string): string {
  return name.replace(/^[a-z]\./, '');
}
function makeForwardSlashes(path: string): string {
  return path.replace(/\\/g, '/');
}
function removeFileExtension(filePath: string): string {
  return filePath.replace(/\.[^/.]+$/, '');
}
function getFileExtension(filePath: string): `.${string}` | null {
  const ext = extname(filePath);
  return ext ? ext as `.${string}` : null;
}
function makeImportPath(fromFile: string, toFile: string): string {
  return removeFileExtension(makeForwardSlashes(relative(fromFile, toFile))).slice(1);
}
function joinFilePaths(base: string, addition: string): string {
  return join(base, addition);
}
function joinApiPaths(base: string, addition: string): string {
  return `${base.endsWith('/') ? base.slice(0, -1) : base}${base && (addition === '' || addition.startsWith('{/')) ? '' : '/'}${addition}`;
}
function parseApiPathPartFromPathSegment(segment: string, removeExtension: boolean): string {
  let name = removeOrderingPrefix(segment);
  if (removeExtension)
    name = removeFileExtension(name);
  // Transform bracket patterns to Express v5 path syntax:
  name = name
  // 1. Catch-all: [...name] → *name
    .replace(/\[\.\.\.(\w+)\]/g, '*$1')
  // 2. Optional segment: [[name]] → {/:name}
    .replace(/\[\[(\w+)\]\]/g, '{/:$1}')
  // 3. Regular params: [name] → :name
    .replace(/\[(\w+)\]/g, ':$1');
  // Handle index files
  return name === 'index' ? '' : name;
}

// methods
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

// import map
function getRoutesImportMapHref(options: RoutesImportMapOptions, forceNew: boolean = false) {
  const importMapPath = getImportMapFilePath(options.rootDir);
  if (forceNew || !existsSync(importMapPath)) {
    const imports = findImports(options)
      .map(({ filePath, apiPath }) => ({ filePath: makeImportPath(importMapPath, filePath), apiPath }));
    const content = `${
        imports.map(({ filePath }, index) => `import * as R${index} from '${filePath}';`).join('')
      }const F=I=>typeof I==='function';const V=M=>!!M?Array.isArray(M)?M.filter(F):F(M)?[M]:null:null;const T=R=>({${
        Object.entries(METHODS).map(([m, M]) => `${m}:V(R.${M})`).join(',')
      }});export default [${
        imports.map(({ apiPath }, index) => `['${apiPath}',T(R${index})]`).join(',')
      }];`;
    writeFileSync(importMapPath, content, 'utf-8');
  }
  return pathToFileURL(importMapPath).href;
}
function getImportMapFilePath(rootDir: RoutesImportMapOptions['rootDir']) {
  return joinFilePaths(rootDir, '../fbr.routes.js');
}
function findImports({ basePath, rootDir, extensions }: RoutesImportMapOptions) {
  return findImportsInDirectory('', rootDir, basePath, extensions);
}
function findImportsInDirectory(dirName: string, parentDirPath: string, parentApiPath: string, extensions: `.${string}`[]): RoutesImportItem[] {
  const dirPath = joinFilePaths(parentDirPath, dirName);
  const apiPath = joinApiPaths(parentApiPath, parseApiPathPartFromPathSegment(dirName, false));
  return readdirSync(dirPath, { withFileTypes: true })
    .flatMap(entry => entry.isDirectory()
      ? findImportsInDirectory(entry.name, dirPath, apiPath, extensions)
      : extensions.includes(getFileExtension(entry.name)!)
      ? {
          filePath: joinFilePaths(dirPath, entry.name),
          apiPath: joinApiPaths(apiPath, parseApiPathPartFromPathSegment(entry.name, true)),
        }
      : []
    );
}
async function importRoutesImportMap(importMapHref: string) {
  return await import(importMapHref).then((m: RoutesImportMapDefault) => m.default);
}

// router
function createRouterFromImportMap(importMap: RoutesImportMap) {
  const router = Router();
  for (const [apiPath, methods] of importMap)
    for (const [method, handlers] of Object.entries(methods))
      if (handlers)
        // @ts-expect-error
        router[method](apiPath, ...handlers);
  return router;
}

// middleware
function responderMiddleware(req: Request, res: Response, next: NextFunction) {
  res.resolve = ({ status, message, data } = {}) => {
    res.status(status ?? 200).json({
      success: true,
      message: message ?? 'Request successful.',
      data: data ?? null,
    });
  };
  res.reject = (({ status, message, error } = {}) => {
    res.status(status ?? 500).json({
      success: false,
      message: message ?? 'An error occurred while processing the request.',
      error: error instanceof Error ? error.message : error ?? null,
    });
  }) as typeof res.reject;
  res.reject.forbidden = () => res.reject({ status: 403, message: 'Forbidden' });
  res.reject.notFound = () => res.reject({ status: 404, message: 'Not Found' });
  res.reject.badRequest = () => res.reject({ status: 400, message: 'Bad Request' });
  res.reject.internalError = () => res.reject({ status: 500, message: 'Internal Server Error' });
  next();
}

// address
function parsePort(port: number | `${number}`): number {
  if (typeof port === 'number')
    return port;
  const parsed = parseInt(port);
  if (isNaN(parsed))
    throw new Error(`Invalid port: ${port}`);
  return parsed;
}
function parseOrigins(origins: string | string[] | null | undefined): string[] | null {
  return !origins
    ? null
    : typeof origins === 'string'
    ? [origins]
    : origins;
}

// server
function createServer({ port, hostname, allowedOrigins, routerOptions, forceNewImportMap }: ServerOptions = {}): Server {
  const server = {
    _allowedOrigins: parseOrigins(allowedOrigins),
    allowedOrigins(origins) {
      if (origins === undefined)
        return server._allowedOrigins;
      server._allowedOrigins = parseOrigins(origins);
    },
    _app: express().use(
      cors({
        origin: (origin, callback) => {
          if (!origin || !server._allowedOrigins || server._allowedOrigins.includes(origin))
            return callback(null, true);
          log.warn(`Blocked CORS request from origin: ${origin}`);
          callback(new Error('Not allowed by CORS'), false);
        }
      }),
      cookieParser(),
      express.json(),
      responderMiddleware,
    ),
    active() {
      return server._httpServer.listening;
    },
    _port: parsePort(port ?? 3000),
    port(port) {
      if (port === undefined)
        return server._port;
      server._port = parsePort(port);
    },
    _hostname: hostname ?? 'localhost',
    hostname(hostname) {
      if (hostname === undefined)
        return server._hostname;
      server._hostname = hostname;
    },
    _routerOptions: {
      rootDir: routerOptions?.rootDir ?? 'src/routes',
      basePath: routerOptions?.basePath ?? '/',
      extensions: routerOptions?.extensions ?? ['.ts', '.js'],
    },
    async start() {
      const importMapHref = getRoutesImportMapHref(server._routerOptions, forceNewImportMap);
      const importMap = await importRoutesImportMap(importMapHref);
      const router = createRouterFromImportMap(importMap);
      server._app.use(router);
      return new Promise<void>((resolve, reject) => {
        server._httpServer.on('error', (error) => {
          log.error('Error starting server:', error);
          reject(error);
        });
        server._httpServer.listen(server._port, server._hostname, () => {
          log.info(`Server is running on http://${server._hostname}:${server._port}`);
          resolve();
        });
      });
    },
    async stop() {
      if (server.active())
        return new Promise<void>((resolve, reject) => {
          server._httpServer.close((error) => {
            if (error) {
              log.error('Error stopping server:', error);
              reject(error);
            } else {
              log.info('Server stopped successfully.');
              resolve();
            }
          });
        });
      else
        log.warn('Attempted to stop server, but it is not running.');
    }
  } as Server;
  server._httpServer = createHttpServer(server._app);
  return server;
}

// config
function getConfigHref(): string {
  let configPath = process.env.FBR_CONFIG_PATH;
  const configArgIndex = process.argv.findIndex(arg => arg === '--config' || arg === '-c');
  if (configArgIndex !== -1 && configArgIndex < process.argv.length - 2)
    return process.argv[configArgIndex + 1];
  return pathToFileURL(configPath ?? 'fbr.config').href;
}
async function loadConfig(): Promise<Config> {
  try {
    const configModule = await import(getConfigHref());
    return configModule.default ?? {};
  } catch (error) {
    log.error('Error loading configuration:', error);
    return {};
  }
}

// entry point
const ready = new Promise<Server>(async (resolve) => {
  const config = await loadConfig();
  log.level(config.logLevel!);
  const server = createServer({
    ...config.server,
    routerOptions: config.router,
  });
  if (config.plugins)
    for await (const plugin of config.plugins)
      plugin(server);
  resolve(server);
});


export default ready;
export type { Config, Log, LogLevel, Server } from './types';
export { ready };

