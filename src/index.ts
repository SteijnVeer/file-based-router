import type { Server } from './types';
import { createServer, loadConfig } from './utils';

// entry point
const ready = new Promise<Server>(async (resolve) => {
  const config = await loadConfig();
  log.level(config.logLevel!);
  const server = createServer({
    ...config.server,
    routerOptions: config.router,
  });
  if (config.plugins)
    for await (const plugin of config.plugins)
      plugin(server);
  resolve(server);
});


export default ready;
export type { Config, Log, LogLevel, RoutesImportMapOptions, Server, ServerOptions } from './types';
export { ready };

