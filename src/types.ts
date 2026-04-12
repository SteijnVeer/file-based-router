import { type Express } from 'express';
import type { Server as HttpServer } from 'http';

// log
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';
interface Log {
  (message: string, level?: LogLevel): void;
  _level: LogLevel;
  level(): LogLevel;
  level(level: LogLevel): void;
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

// import map
interface RoutesImportItem {
  apiPath: string;
  filePath: string;
}
interface RoutesImportMapOptions {
  rootDir: string;
  basePath: `/${string}`;
  extensions: `.${string}`[];
}
type RoutesImportMap = [string, Record<string, Function[] | null>][];
type RoutesImportMapDefault = { default: RoutesImportMap };

// server
interface Server {
  _allowedOrigins: string[] | null;
  allowedOrigins(): string[] | null;
  allowedOrigins(origins: string | string[] | null): void;
  _app: Express;
  _httpServer: HttpServer | null;
  active(): boolean;
  _port: number;
  port(): number;
  port(port: number | `${number}`): void;
  _hostname: string;
  hostname(): string;
  hostname(hostname: string): void;
  _routerOptions: RoutesImportMapOptions;
  start(): Promise<void>;
  stop(): Promise<void>;
}
interface ServerOptions {
  port?: number | `${number}`;
  hostname?: string;
  allowedOrigins?: string | string[] | null;
  routerOptions?: Partial<RoutesImportMapOptions>;
  forceNewImportMap?: boolean;
}

// config
type Config = Partial<{
  logLevel: LogLevel;
  server: Omit<ServerOptions, 'routerOptions'>;
  router: RoutesImportMapOptions;
  plugins: ((server: Server) => any)[];
}>;


export type { Config, Log, LogLevel, RoutesImportItem, RoutesImportMap, RoutesImportMapDefault, RoutesImportMapOptions, Server, ServerOptions };

