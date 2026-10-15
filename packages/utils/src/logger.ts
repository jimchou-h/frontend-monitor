import { _global, _support } from './global';

const PREFIX = 'FrontendMonitor';

export class Logger {
  private enabled = false;
  private _console: Console = {} as Console;

  constructor() {
    const target = _global.console || {};
    const logType = ['log', 'debug', 'info', 'warn', 'error', 'assert'];
    logType.forEach((level) => {
      if (typeof target[level] === 'function') {
        this._console[level as keyof Console] = target[level].bind(target);
      }
    });
  }

  bindOptions(debug?: boolean): void {
    this.enabled = !!debug;
  }

  log(...args: any[]): void {
    if (!this.enabled) return;
    this._console.log(`${PREFIX}[Log]:`, ...args);
  }

  warn(...args: any[]): void {
    if (!this.enabled) return;
    this._console.warn(`${PREFIX}[Warn]:`, ...args);
  }

  error(...args: any[]): void {
    if (!this.enabled) return;
    this._console.error(`${PREFIX}[Error]:`, ...args);
  }
}

const logger: Logger = _support.logger || (_support.logger = new Logger());
export { logger };
