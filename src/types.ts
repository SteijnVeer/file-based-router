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
  error(message: string, error?: any): void;
}

// plugin — no params; access server/config via globals
type Plugin = () => void | Promise<void>;

// special sentinel: use process.env[PARENT_CHILD] instead of a hardcoded value
type UseEnv = 'USE_ENV';

// user-facing config input type (deep partial of Fbr.Config)
// plugins extend Fbr.Config via: declare global { namespace Fbr { interface Config { ... } } }
type UserConfig = Omit<{
  [K in keyof Fbr.Config]?: Fbr.Config[K] extends (infer _)[]
    ? Fbr.Config[K] | UseEnv
    : Fbr.Config[K] extends object
    ? { [P in keyof Fbr.Config[K]]?: Fbr.Config[K][P] | UseEnv }
    : Fbr.Config[K] | UseEnv
}, 'plugins'> & {
  plugins?: (Plugin | string)[] | UseEnv;
};

// global declarations
declare global {
  namespace Fbr {
    /**
     * The server instance. Extend this interface to add plugin-specific properties:
     * @example
     * declare global { namespace Fbr { interface Server { myProp: string } } }
     */
    interface Server {
      _allowedOrigins: string[] | null;
      allowedOrigins(): string[] | null;
      allowedOrigins(origins: string | string[] | null): void;
      _app: Express;
      _httpServer: HttpServer;
      active(): boolean;
      _port: number;
      port(): number;
      port(port: number | `${number}`): void;
      _hostname: string;
      hostname(): string;
      hostname(hostname: string): void;
      _routesBasePath: string;
      routesBasePath(): string;
      routesBasePath(path: string): void;
      _routerApplied: boolean;
      routerApplied(): boolean;
      start(): Promise<void>;
      stop(): Promise<void>;
    }
    /**
     * The resolved configuration. Extend this interface to add plugin-specific config:
     * @example
     * declare global { namespace Fbr { interface Config { myPlugin?: MyPluginConfig } } }
     */
    interface Config {
      logLevel: {
        dev: LogLevel;
        prod: LogLevel;
      };
      paths: {
        buildDir: string;
        srcDir: string;
      };
      server: {
        port: number | `${number}`;
        hostname: string;
        allowedOrigins: string[] | null;
      };
      router: {
        routesDir: string;
        routesBasePath: string;
      };
      plugins: Plugin[];
    }
    /** Whether the process is running in development mode. */
    const isDev: boolean;
    /** The singleton server instance. */
    const server: Fbr.Server;
    /** The resolved configuration. */
    const config: Fbr.Config;
    /** Global logger (also available as top-level `log`). */
    const log: Log;
  }
  /** Global logger. Available in all route files and plugins. */
  const log: Log;
  namespace Express {
    interface Response {
      resolve: (details?: {
        status?: number;
        message?: string;
        data?: object | null;
      }) => void;
      reject: {
        (details?: {
          status?: number;
          message?: string;
          error?: Error | string;
        }): void;
        forbidden(): void;
        notFound(): void;
        badRequest(): void;
        internalError(): void;
      };
    }
  }
}


export type { NextFunction, Request, Response } from 'express';
export type { Log, LogLevel, Plugin, UseEnv, UserConfig };

