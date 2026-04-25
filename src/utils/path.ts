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
function parseApiPathPartFromPathSegment(segment: string, removeExtension: boolean): string {
  let name = removeOrderingPrefix(segment);
  if (removeExtension)
    name = removeFileExtension(name);
  name = name
    .replace(/\[\.\.\.(\w+)\]/g, '*$1')
    .replace(/\[\[(\w+)\]\]/g, '{/:$1}')
    .replace(/\[(\w+)\]/g, ':$1');
  return name === 'index' ? '' : name;
}
function importFile(...paths: string[]): Promise<any> {
  return import(pathToFileURL(resolve(...paths)).href);
}


export { getFileExtension, importFile, joinApiPaths, joinFilePaths, makeForwardSlashes, makeImportPath, parseApiPathPartFromPathSegment, removeFileExtension, removeOrderingPrefix };

