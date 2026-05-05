import type { Dirent } from 'fs';
import { readdirSync } from 'fs';
import { getFileExtension, getFileHref, joinFilePaths, removeFileExtension } from '../core/path';

interface FileEntry {
  name: string;
  extension: string;
  paths: string[];
  href: string;
}
interface FileEntryImport<T extends Record<string, any> = Record<string, any>> extends FileEntry {
  mod: T | null;
}
function createFileEntry(dirent: Dirent<string>, paths: string[]) {
  const ext = getFileExtension(dirent.name);
  const name = ext
    ? removeFileExtension(dirent.name)
    : dirent.name;
  return {
    name,
    extension: ext ?? '',
    paths: [...paths, name],
    href: getFileHref(...paths, name),
  };
}
async function importFileEntry<T extends Record<string, any> = Record<string, any>>(entry: FileEntry): Promise<FileEntryImport<T>> {
  let mod: T | null = null;
  try {
    mod = await import(entry.href) as T;
  } catch {
    mod = null;
  } finally {
    return { ...entry, mod };
  }
}
function importFileEntries<T extends Record<string, any> = Record<string, any>>(entries: FileEntry[]): Promise<FileEntryImport<T>[]> {
  return Promise.all(entries.map(entry => importFileEntry<T>(entry)));
}
function findFiles(dir: string, ...__paths: string[]): FileEntry[] {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap(entry => entry.isDirectory()
      ? findFiles(joinFilePaths(dir, entry.name), ...__paths, entry.name)
      : createFileEntry(entry, __paths)
    );
}
findFiles.import = <T extends Record<string, any> = Record<string, any>>(dir: string): Promise<FileEntryImport<T>[]> =>
  importFileEntries<T>(findFiles(dir));


export { findFiles, importFileEntries, importFileEntry };
export type { FileEntry, FileEntryImport };
export default findFiles;

