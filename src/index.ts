import { config } from './core/config';
import { log } from './core/log';
import { server } from './core/server';

(global as any).Fbr = { isDev: process.env.NODE_ENV === 'development', log, config, server };

log.level(Fbr.isDev ? config.logLevel.dev : config.logLevel.prod);

server.port(config.server.port);
server.hostname(config.server.hostname);
server.allowedOrigins(config.server.allowedOrigins);
server.routesBasePath(config.router.routesBasePath);
server.staticFilesDir(config.server.staticFilesDir);

for await (const plugin of config.plugins)
  await plugin();


export { server };
export default server;
export type * from './types';

