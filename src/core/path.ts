import { extname, join, relative, resolve } from 'path';
import { pathToFileURL } from 'url';

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
  return `${base.endsWith('/') ? base.slice(0, -1) : base}${!!base && (!addition || addition.startsWith('{/')) ? '' : '/'}${addition}`;
}
function parseApiPathPartFromPathSegment(segment: string, removeExtension: boolean = false): string {
  let name = removeOrderingPrefix(segment);
  if (removeExtension)
    name = removeFileExtension(name);
  name = name
    .replace(/\[\.\.\.(\w+)\]/g, '*$1')
    .replace(/\[\[(\w+)\]\]/g, '{/:$1}')
    .replace(/\[(\w+)\]/g, ':$1');
  return name === 'index' ? '' : name;
}
function createApiPathFromPathParts(paths: string[]): string {
  return paths.reduce((acc, path) => joinApiPaths(acc, parseApiPathPartFromPathSegment(path)), '/');
}
function createFilePathFromPathParts(paths: string[]): string {
  return `./${makeForwardSlashes(join(...paths))}`;
}
function getFileHref(...paths: string[]): string {
  return pathToFileURL(resolve(...paths)).href;
}
function importFile(path: string): Promise<any>;
function importFile(fileHref: string): Promise<any>;
function importFile(...paths: string[]): Promise<any>;
function importFile(path: string, ...paths: string[]): Promise<any> {
  const href = !paths.length && path.startsWith('file://')
    ? path
    : getFileHref(path, ...paths);
  return import(href);
}


export { createApiPathFromPathParts, createFilePathFromPathParts, getFileExtension, getFileHref, importFile, joinApiPaths, joinFilePaths, makeForwardSlashes, makeImportPath, parseApiPathPartFromPathSegment, removeFileExtension, removeOrderingPrefix };

