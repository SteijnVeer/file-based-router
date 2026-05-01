import type { Express, NextFunction, Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { Server as HttpServer } from 'http';
import type { ParsedQs } from 'qs';

// zod schema type
interface ZodObjectSchema<O extends Record<string, any> = Record<string, any>> {
  _zod: { output: O };
  safeParse(data: unknown): { success: true; data: O } | { success: false; error: unknown };
}
type ZodInfer<S extends ZodObjectSchema> = S extends ZodObjectSchema<infer O> ? O : never;

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
    : NonNullable<Fbr.Config[K]> extends object
    ? { [P in keyof NonNullable<Fbr.Config[K]>]?: NonNullable<Fbr.Config[K]>[P] | UseEnv }
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
      _staticFilesDir: string | null;
      staticFilesDir(): string | null;
      staticFilesDir(path: string | null): void;
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
        staticFilesDir: string | null;
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

    // route types
    type ReqData = Record<string, any> | ZodObjectSchema;
    type ReqBody<D extends Fbr.ReqData = any> = D extends ZodObjectSchema<infer O> ? O : D;
    type ResData = Record<string, any> | null;
    type ResBody<D extends Fbr.ResData = any> = {
      success: true;
      message: string;
      data: D;
    } | {
      success: false;
      message: string;
      error: string | null;
    };
    type ResolveDetails<D> =
      [D] extends [never] ? (details?: { status?: number; message?: string }) => void :
      [D] extends [undefined] ? (details?: { status?: number; message?: string; data?: Fbr.ResData }) => void :
      [D] extends [null] ? (details?: { status?: number; message?: string }) => void :
      (details?: { status?: number; message?: string; data: D }) => void;
    type ResolveShorthandFn<D> =
      [D] extends [never] ? () => void :
      [D] extends [null] ? () => void :
      [D] extends [undefined] ? (data?: Fbr.ResData) => void :
      (data: D) => void;
    type ResolveFn<D> = ResolveDetails<D> & {
      created: ResolveShorthandFn<D>;
      accepted: ResolveShorthandFn<D>;
      found: ResolveShorthandFn<D>;
      updated: ResolveShorthandFn<D>;
      deleted: ResolveShorthandFn<D>;
      noContent: ResolveShorthandFn<never>;
    };
    type ErrorLike = Error | string | null | undefined;
    type RejectFn = {
      (details?: { status?: number; message?: string; error?: Fbr.ErrorLike }): void;
      forbidden(error?: Fbr.ErrorLike): void;
      notFound(error?: Fbr.ErrorLike): void;
      badRequest(error?: Fbr.ErrorLike): void;
      internalError(error?: Fbr.ErrorLike): void;
    };
    type Req<D extends Fbr.ResData = any, B extends Fbr.ReqData = any> = Request<ParamsDictionary, Fbr.ResBody<D>, Fbr.ReqBody<B>, ParsedQs, Record<string, any>>;
    type Res<D extends Fbr.ResData | undefined = undefined> = Omit<Response<Fbr.ResBody<D extends undefined ? any : D>, Record<string, any>>, 'resolve'> & { resolve: Fbr.ResolveFn<D>; reject: Fbr.RejectFn; };
    type Next = NextFunction;
    type VoidLike = void | Promise<void>;
    type RouteHandler<D extends Fbr.ResData | undefined = undefined, B extends Fbr.ReqData = any> = (req: Fbr.Req<D extends undefined ? any : D, B>, res: Fbr.Res<D>) => Fbr.VoidLike;
    type Middleware<D extends Fbr.ResData | undefined = undefined, B extends Fbr.ReqData = any> = (req: Fbr.Req<D extends undefined ? any : D, B>, res: Fbr.Res<D>, next: Fbr.Next) => Fbr.VoidLike;
    type ErrorHandler<D extends Fbr.ResData | undefined = undefined, B extends Fbr.ReqData = any> = (err: Error, req: Fbr.Req<D extends undefined ? any : D, B>, res: Fbr.Res<D>, next: Fbr.Next) => Fbr.VoidLike;
    type Route<D extends Fbr.ResData | undefined = undefined, B extends Fbr.ReqData = any> = Fbr.RouteHandler<D, B> | Fbr.Middleware<D, B> | Fbr.ErrorHandler<D, B>;
    type RouteFileExport = Fbr.Route | Fbr.Route[];
  }
  /** Global logger. Available in all route files and plugins. */
  const log: Log;
  namespace Express {
    interface Response {
      resolve: Fbr.ResolveFn<any>;
      reject: Fbr.RejectFn;
    }
  }
}

// module-level aliases
type ReqData = Fbr.ReqData;
type ReqBody<D extends Fbr.ReqData = any> = Fbr.ReqBody<D>;
type ResData = Fbr.ResData;
type ResBody<D extends Fbr.ResData = any> = Fbr.ResBody<D>;
type Req<D extends Fbr.ResData = any, B extends Fbr.ReqData = any> = Fbr.Req<D, B>;
type Res<D extends Fbr.ResData | undefined = undefined> = Fbr.Res<D>;
type Next = Fbr.Next;
type RouteHandler<D extends Fbr.ResData | undefined = undefined, B extends Fbr.ReqData = any> = Fbr.RouteHandler<D, B>;
type Middleware<D extends Fbr.ResData | undefined = undefined, B extends Fbr.ReqData = any> = Fbr.Middleware<D, B>;
type ErrorHandler<D extends Fbr.ResData | undefined = undefined, B extends Fbr.ReqData = any> = Fbr.ErrorHandler<D, B>;
type Route<D extends Fbr.ResData | undefined = undefined, B extends Fbr.ReqData = any> = Fbr.Route<D, B>;
type RouteFileExport = Fbr.RouteFileExport;


export type { ErrorHandler, Log, LogLevel, Middleware, Next, Plugin, Req, ReqBody, ReqData, Res, ResBody, ResData, Route, RouteFileExport, RouteHandler, UseEnv, UserConfig, ZodInfer, ZodObjectSchema };


