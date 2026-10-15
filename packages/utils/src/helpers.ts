import { ErrorTypes, VoidFun } from '@frontend-monitor/shared';
import type { ErrorStack, IAnyObject, IntegrationError } from '@frontend-monitor/types';
import { globalVar } from '@frontend-monitor/shared';
import { nativeToString, variableTypeDetection } from './is';

export function getLocationHref(): string {
  if (typeof document === 'undefined' || document.location == null) return '';
  return document.location.href;
}

export function on(
  target: IAnyObject,
  eventName: string,
  handler: (...args: any[]) => void,
  options: boolean | unknown = false,
): void {
  if (!target || typeof target.addEventListener !== 'function') return;
  target.addEventListener(eventName, handler, options);
}

export function replaceOld(
  source: IAnyObject,
  name: string,
  replacement: (original: any) => any,
  isForced = false,
): void {
  if (source === undefined) return;
  if (name in source || isForced) {
    const original = source[name];
    const wrapped = replacement(original);
    if (typeof wrapped === 'function') {
      source[name] = wrapped;
    }
  }
}

export const defaultFunctionName = '<anonymous>';

export function getFunctionName(fn: unknown): string {
  if (!fn || typeof fn !== 'function') return defaultFunctionName;
  return fn.name || defaultFunctionName;
}

export function throttle(fn: Function, delay: number): Function {
  let canRun = true;
  return function (this: any, ...args: any) {
    if (!canRun) return;
    fn.apply(this, args);
    canRun = false;
    setTimeout(() => {
      canRun = true;
    }, delay);
  };
}

export function getTimestamp(): number {
  return Date.now();
}

export function generateUUID(): string {
  let d = new Date().getTime();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function unknownToString(target: unknown): string {
  if (variableTypeDetection.isString(target)) return target as string;
  if (variableTypeDetection.isUndefined(target)) return 'undefined';
  try {
    return JSON.stringify(target);
  } catch (_e) {
    return String(target);
  }
}

export function parseUrlToObj(url: string): {
  host?: string;
  path?: string;
  protocol?: string;
  relative?: string;
} {
  if (!url) return {};
  const match = url.match(/^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?$/);
  if (!match) return {};
  const query = match[6] || '';
  const fragment = match[8] || '';
  return {
    host: match[4],
    path: match[5],
    protocol: match[2],
    relative: match[5] + query + fragment,
  };
}

export function htmlElementAsString(target: HTMLElement): string {
  if (!target || !target.tagName) return '';
  const tagName = target.tagName.toLowerCase();
  if (tagName === 'body' || tagName === 'html') return '';
  const classNames = typeof target.classList !== 'undefined' ? target.classList.value : '';
  const id = target.id ? ` id="${target.id}"` : '';
  const text = target.innerText || '';
  return `<${tagName}${id}${classNames ? ` class="${classNames}"` : ''}>${text.slice(0, 80)}</${tagName}>`;
}

export function setUrlQuery(url: string, query: IAnyObject): string {
  const queryArr: string[] = [];
  Object.keys(query).forEach((k) => {
    queryArr.push(`${k}=${query[k]}`);
  });
  return url.indexOf('?') !== -1 ? `${url}&${queryArr.join('&')}` : `${url}?${queryArr.join('&')}`;
}

export function interceptStr(str: string, interceptLength: number): string {
  if (variableTypeDetection.isString(str)) {
    return str.slice(0, interceptLength) + (str.length > interceptLength ? '...' : '');
  }
  return '';
}

export function silentConsoleScope(callback: Function) {
  globalVar.isLogAddBreadcrumb = false;
  callback();
  globalVar.isLogAddBreadcrumb = true;
}

export function validateOption(target: any, targetName: string, expectType: string): boolean {
  if (typeof target === expectType) return true;
  if (typeof target !== 'undefined') {
    console.warn(`[FrontendMonitor] ${targetName} 期望传入 ${expectType} 类型，目前是 ${typeof target} 类型`);
  }
  return false;
}

export function toStringValidateOption(target: any, targetName: string, expectType: string): boolean {
  if (nativeToString.call(target) === expectType) return true;
  if (typeof target !== 'undefined') {
    console.warn(`[FrontendMonitor] ${targetName} 期望传入 ${expectType} 类型，目前是 ${nativeToString.call(target)} 类型`);
  }
  return false;
}

export function getCurrentRoute(): string {
  const g = globalThis as any;
  if (typeof g.getCurrentPages === 'function') {
    const pages = g.getCurrentPages();
    if (pages && pages.length > 0) {
      const currentPage = pages[pages.length - 1];
      return setUrlQuery(currentPage.route || '', currentPage.options || {});
    }
    return 'App';
  }
  if (typeof document !== 'undefined' && document.location) {
    return document.location.pathname + document.location.search;
  }
  return '';
}

export function parseErrorString(str: string): IntegrationError | null {
  const splitLine: string[] = str.split('\n');
  if (splitLine.length < 2) return null;
  if (splitLine[0].indexOf('MiniProgramError') !== -1) splitLine.splice(0, 1);
  const message = splitLine.splice(0, 1)[0];
  const name = splitLine[0] ? splitLine[0].split(':')[0] : ErrorTypes.UNKNOWN;
  const stack: ErrorStack[] = [];
  splitLine.forEach((errorLine: string) => {
    const regexpGetFun = /at\s+([\S]+)\s+\(/;
    const regexGetFile = /\(([^)]+)\)/;
    const regexGetFileNoParenthese = /\s+at\s+(\S+)/;
    const funcExec = regexpGetFun.exec(errorLine);
    let fileURLExec = regexGetFile.exec(errorLine);
    if (!fileURLExec) fileURLExec = regexGetFileNoParenthese.exec(errorLine);
    const funcNameMatch = funcExec && funcExec.length > 0 ? funcExec[1].trim() : '';
    const fileURLMatch = fileURLExec && fileURLExec.length > 0 ? fileURLExec[1] : '';
    const lineInfo = fileURLMatch.split(':');
    stack.push({
      args: [],
      func: funcNameMatch || ErrorTypes.UNKNOWN_FUNCTION,
      column: Number(lineInfo.pop()) || null,
      line: Number(lineInfo.pop()) || null,
      url: lineInfo.join(':'),
    });
  });
  return { message, name, stack };
}
