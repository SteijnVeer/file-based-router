import type { Log } from '../types';
import { LOG_LEVELS } from './constant';

const log: Log = (message, level = 'info') => {
  if (LOG_LEVELS.indexOf(level) >= LOG_LEVELS.lastIndexOf(log._level)) {
    const prefix = `[${level.toUpperCase()}] `;
    process.stdout.write(`${prefix}${message.split('\n').join(`\n${prefix}`)}\n`);
  }
};
log._level = 'info';
log.level = ((level) => {
  if (!level)
    return log._level;
  if (!LOG_LEVELS.includes(level))
    throw new Error(`Invalid log level: ${level}`);
  log._level = level;
}) as typeof log.level;
log.debug = (message) => log(message, 'debug');
log.info = (message) => log(message, 'info');
log.warn = (message) => log(message, 'warn');
log.error = (message, error) => log(message + (error ? `\n${error instanceof Error ? error.stack : String(error)}` : ''), 'error');
(global as any).log = log;


export { log, LOG_LEVELS };
export default log;

