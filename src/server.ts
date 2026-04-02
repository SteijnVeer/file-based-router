import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import './log';
import { responderMiddleware } from './middleware';
import { type FileBasedRouterOptions, createFileBasedRouter } from './router';

// helpers
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

// main
interface Server {
  _allowedOrigins: string[] | null;
  allowedOrigins(): string[] | null;
  allowedOrigins(origins: string | string[] | null): void;
  _app: Express;
  _port: number;
  port(): number;
  port(port: number | `${number}`): void;
  _hostname: string;
  hostname(): string;
  hostname(hostname: string): void;
  start(): Promise<void>;
}
interface ServerOptions {
  port: number | `${number}`;
  hostname: string;
  allowedOrigins: string | string[] | null;
  routerOptions: FileBasedRouterOptions;
}
function createServer({ port, hostname, allowedOrigins, routerOptions }: ServerOptions): Server {
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
    async start() {
      const router = await createFileBasedRouter(routerOptions);
      server._app.use(router);
      return new Promise<void>((resolve, reject) => {
        server._app.listen(server._port, server._hostname, (error) => {
          if (error) {
            log.error(`Error starting server: ${error instanceof Error ? error.stack : String(error)}`);
            reject(error);
          } else {
            log.info(`Server is running on http://${server._hostname}:${server._port}`);
            resolve();
          }
        });
      });
    },
  } as Server;
  return server;
}


export { createServer };
export type { Server, ServerOptions };

