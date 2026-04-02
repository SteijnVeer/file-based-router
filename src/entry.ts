import { loadConfig } from './config';
import './log';
import { createServer } from './server';

export default (async () => {
  try {
    const config = await loadConfig();
    log.level(config.logLevel);
    log.debug('Loaded configuration:\n' + JSON.stringify(config, null, 2));
    return createServer({ ...config.server, routerOptions: config.router });
  } catch (error) {
    log.error(`Error initializing server: ${error instanceof Error ? error.stack : String(error)}`);
    process.exit(1);
  }
})();
