type LogLevel = typeof LOG_LEVELS[number];
const LOG_LEVELS = ['debug', 'info', 'warn', 'error', 'none', 'none'] as const;

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

const log: Log = (message: string, level: LogLevel = 'info') => {
  if (LOG_LEVELS.indexOf(level) >= LOG_LEVELS.lastIndexOf(log._level)) {
    const prefix = `[${level.toUpperCase()}] `;
    process.stdout.write(`${prefix}${message.split('\n').join(`\n${prefix}`)}\n`);
  }
};
log._level = 'info';
log.level = ((level?: LogLevel) => {
  if (!level)
    return log._level;
  if (!LOG_LEVELS.includes(level))
    throw new Error(`Invalid log level: ${level}`);
  log._level = level;
}) as typeof log.level;
log.debug = (message) => log(message, 'debug');
log.info = (message) => log(message, 'info');
log.warn = (message) => log(message, 'warn');
log.error = (message) => log(message, 'error');

global.log = log;
declare global {
  var log: Log;
}

export default log;
export { log, LOG_LEVELS };
export type { Log, LogLevel };

