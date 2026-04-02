import { Router } from 'express';
import { readdir } from 'fs/promises';
import { pathToFileURL } from 'url';
import './log';

// tree types
type Branch = {
  dirName: string;
  filePath: string;
  apiName: string;
  apiPath: string;
  children: Node[];
};
type Leaf = {
  fileName: string;
  filePath: string;
  fileUrl: string;
  apiName: string;
  apiPath: string;
  methods: MethodsImport;
};
type Node = Branch | Leaf;

// routes
type Route = {
  method: Method;
  path: string;
  handlers: any[];
};
function extractRoutesFromNode(node: Node): Route[] {
  return 'methods' in node
    ? Object.entries(node.methods).map(([method, handlers]) => ({
        method: method as Method,
        path: node.apiPath,
        handlers,
      }))
    : 'children' in node
    ? node.children.flatMap(child => extractRoutesFromNode(child))
    : [];
}

// methods
const METHODS = {
  GET: 'get',
  POST: 'post',
  PUT: 'put',
  DELETE: 'delete',
  PATCH: 'patch',
  OPTIONS: 'options',
  HEAD: 'head',
  ALL: 'use',
} as const;
type MethodKey = keyof typeof METHODS;
type Method = typeof METHODS[MethodKey];
const METHODS_MAP = new Map(Object.entries(METHODS)) as Map<MethodKey, Method>;
const METHODS_REVERSE_MAP = new Map(
  Object.entries(METHODS).map(([k, v]) => [v, k])
) as Map<Method, MethodKey>;
type MethodsImport = Partial<Record<Method, Function[]>>;

// path helpers
function joinFilePaths(base: string, addition: string): string {
  return addition ? `${base}\\${addition}`: base;
}
function joinApiPaths(base: string, addition: string): string {
  return `${base.endsWith('/') ? base.slice(0, -1) : base}${base && (addition === '' || addition.startsWith('{/')) ? '' : '/'}${addition}`;
}
function parseApiPathPartFromPathName(pathName: string, removeExtension: boolean): string
function parseApiPathPartFromPathName(dirName: string, removeExtension: false): string
function parseApiPathPartFromPathName(fileName: string, removeExtension: true): string
function parseApiPathPartFromPathName(pathName: string, removeExtension: boolean): string {
  // Remove ordering prefix (e.g., "a.", "b.", "z.")
  let name = pathName.replace(/^[a-z]\./, '');
  // Remove extension if needed
  if (removeExtension)
    name = name.replace(/\.[^/.]+$/, '');
  // Transform bracket patterns to Express v5 path syntax (order matters!)
  name = name
  // 1. Catch-all: [...name] → *name
    .replace(/\[\.\.\.(\w+)\]/g, '*$1')
  // 2. Optional segment: [[name]] → {/:name} (includes the slash)
    .replace(/\[\[(\w+)\]\]/g, '{/:$1}')
  // 3. Regular params: [name] → :name
    .replace(/\[(\w+)\]/g, ':$1');
  // Handle index files
  return name === 'index' ? '' : name;
}

// tree builders
interface ImportMethodsFromDirectoryOptions {
  dirName: string;
  parentFilePath: string;
  parentApiPath: string;
  extensions: string[];
}
async function importMethodsFromDirectory({ dirName, parentFilePath, parentApiPath, extensions }: ImportMethodsFromDirectoryOptions): Promise<Branch> {
  const dirPath = joinFilePaths(parentFilePath, dirName);
  const apiName = parseApiPathPartFromPathName(dirName, false);
  const apiPath = joinApiPaths(parentApiPath, apiName);

  const entries = await readdir(dirPath, { withFileTypes: true, recursive: false });
  const children: Node[] = [];

  for await (const entry of entries)
    if (entry.isDirectory())
      children.push(await importMethodsFromDirectory({
        dirName: entry.name,
        parentFilePath: dirPath,
        parentApiPath: apiPath,
        extensions,
      }));
    else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext)))
      children.push(await importMethodsFromModule({
        fileName: entry.name,
        parentFilePath: dirPath,
        parentApiPath: apiPath,
      }));

  return { dirName, filePath: dirPath, apiName, apiPath, children };
}
interface ImportMethodsFromModuleOptions {
  fileName: string;
  parentFilePath: string;
  parentApiPath: string;
}
async function importMethodsFromModule({ fileName, parentFilePath, parentApiPath }: ImportMethodsFromModuleOptions): Promise<Leaf> {
  const filePath = joinFilePaths(parentFilePath, fileName);
  const apiName = parseApiPathPartFromPathName(fileName, true);
  const apiPath = joinApiPaths(parentApiPath, apiName);

  const fileUrl = pathToFileURL(filePath).href;
  const module = await import(fileUrl);
  
  const methods: MethodsImport = {};
  for (const [M, m] of METHODS_MAP)
    if (M in module) {
      const imported = module[M];
      const handlers = (Array.isArray(imported) ? imported : [imported]).filter(v => typeof v === 'function');
      if (handlers.length > 0)
        methods[m] = handlers;
    }
  
  return { fileName, filePath, fileUrl, apiName, apiPath, methods };
}

// main
interface FileBasedRouterOptions {
  rootDir: string;
  basePath: `/${string}`;
  allowedExtensions: `.${string}`[];
}
async function createFileBasedRouter({ rootDir, basePath, allowedExtensions }: FileBasedRouterOptions) {
  const router = Router();
  try {
    log.debug(`Setting up router from directory: ${rootDir} with base API path: ${basePath} and allowed extensions: ${allowedExtensions.join(', ')}`);
    const rootNode = await importMethodsFromDirectory({
      dirName: '',
      parentFilePath: rootDir,
      parentApiPath: basePath,
      extensions: allowedExtensions,
    });
    const routes = extractRoutesFromNode(rootNode);
    for (const { method, path, handlers } of routes)
      router[method](path, ...handlers);
    log.debug(`Successfully set up router with ${routes.length} routes.`);
    if (routes.length > 0) {
      log.debug('Registered routes:');
      for (const { method, path, handlers } of routes)
        log.debug(`${METHODS_REVERSE_MAP.get(method)!.padStart(8)} ${path}${handlers.length > 1 ? ` (${handlers.length})` : ''}`);
    }
  } catch (error) {
    log.error(`Error setting up router: ${error instanceof Error ? error.stack : String(error)}`);
  }
  return router;
}


export { createFileBasedRouter };
export type { FileBasedRouterOptions };

