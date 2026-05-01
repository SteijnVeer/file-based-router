import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { createServer as createHttpServer } from 'http';
import { responderMiddleware } from './middleware';
import { getRouter } from './router';

const server = {
  _allowedOrigins: null,
  allowedOrigins(origins) {
    if (origins === undefined)
      return server._allowedOrigins;
    server._allowedOrigins = !origins
      ? null
      : typeof origins === 'string'
      ? [origins]
      : origins;
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
  _port: 3000,
  port(port) {
    if (port === undefined)
      return server._port;
    if (typeof port === 'number') {
      server._port = port;
      return;
    }
    const parsed = parseInt(port);
    if (isNaN(parsed))
      throw new Error(`Invalid port: ${port}`);
    server._port = parsed;
  },
  _hostname: 'localhost',
  hostname(hostname) {
    if (hostname === undefined)
      return server._hostname;
    server._hostname = hostname;
  },
  _routesBasePath: '/',
  routesBasePath(path) {
    if (path === undefined)
      return server._routesBasePath;
    if (!path.startsWith('/'))
      server._routesBasePath = `/${path}`;
    else
      server._routesBasePath = path;
  },
  _staticFilesDir: null,
  staticFilesDir(path) {
    if (path === undefined)
      return server._staticFilesDir;
    server._staticFilesDir = path;
  },
  _routerApplied: false,
  routerApplied() {
    return server._routerApplied;
  },
  async start() {
    if (server.active())
      return log.warn('Attempted to start server, but it is already running.');
    if (!server.routerApplied()) {
      if (server._staticFilesDir !== null) {
        server._app.use(express.static(server._staticFilesDir));
        log.info(`Serving static files from: ${server._staticFilesDir}`);
      }
      const router = await getRouter();
      server._app.use(server.routesBasePath(), router);
      server._routerApplied = true;
    }
    return new Promise<void>((resolve, reject) => {
      server._httpServer.on('error', (error) => {
        log.error('Error starting server:', error);
        reject(error);
      });
      server._httpServer.listen(server._port, server._hostname, () => {
        process.on('SIGINT', async () => {
          if (server.active()) {
            log.info('SIGINT received, stopping server...');
            await server.stop();
          }
          process.exit(0);
        });
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
} as Fbr.Server;
server._httpServer = createHttpServer(server._app);


export { server };
export default server;

