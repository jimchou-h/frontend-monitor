import { ErrorTypes } from '@frontend-monitor/shared';
import type { ReportDataType, ErrorStack } from '@frontend-monitor/types';
import { Severity } from './Severity';
import { getLocationHref, getTimestamp } from './helpers';

export function extractErrorStack(ex: any, level: Severity): ReportDataType | null {
  const normal: ReportDataType = {
    time: getTimestamp(),
    url: getLocationHref(),
    name: ex?.name || ErrorTypes.UNKNOWN,
    level,
    message: ex?.message || String(ex),
  };
  if (typeof ex?.stack !== 'string' || !ex.stack) return normal;

  const chrome =
    /^\s*at (.*?) ?\(((?:file|https?|blob|chrome-extension|native|eval|webpack|<anonymous>|[a-z]:|\/).*?)(?::(\d+))?(?::(\d+))?\)?\s*$/i;
  const gecko =
    /^\s*(.*?)(?:\((.*?)\))?(?:^|@)((?:file|https?|blob|chrome|webpack|resource|\[native).*?|[^@]*bundle)(?::(\d+))?(?::(\d+))?\s*$/i;
  const winjs =
    /^\s*at (?:((?:\[object object\])?.+) )?\(?((?:file|ms-appx|https?|webpack|blob):.*?):(\d+)(?::(\d+))?\)?\s*$/i;
  const geckoEval = /(\S+) line (\d+)(?: > eval line \d+)* > eval/i;
  const chromeEval = /\((\S*)(?::(\d+))(?::(\d+))\)/;
  const lines = ex.stack.split('\n');
  const stack: ErrorStack[] = [];

  let submatch: RegExpExecArray | null;
  let parts: RegExpExecArray | null;
  let element: ErrorStack | undefined;

  for (let i = 0, j = lines.length; i < j; ++i) {
    element = undefined;
    if ((parts = chrome.exec(lines[i]))) {
      const isNative = parts[2] && parts[2].indexOf('native') === 0;
      const isEval = parts[2] && parts[2].indexOf('eval') === 0;
      if (isEval && (submatch = chromeEval.exec(parts[2]))) {
        parts[2] = submatch[1];
        parts[3] = submatch[2];
        parts[4] = submatch[3];
      }
      element = {
        url: !isNative ? parts[2] : null,
        func: parts[1] || ErrorTypes.UNKNOWN_FUNCTION,
        args: isNative ? [parts[2]] : [],
        line: parts[3] ? Number(parts[3]) : null,
        column: parts[4] ? Number(parts[4]) : null,
      };
    } else if ((parts = winjs.exec(lines[i]))) {
      element = {
        url: parts[2],
        func: parts[1] || ErrorTypes.UNKNOWN_FUNCTION,
        args: [],
        line: Number(parts[3]),
        column: parts[4] ? Number(parts[4]) : null,
      };
    } else if ((parts = gecko.exec(lines[i]))) {
      const isEval = parts[3] && parts[3].indexOf(' > eval') > -1;
      if (isEval && (submatch = geckoEval.exec(parts[3]))) {
        parts[3] = submatch[1];
        parts[4] = submatch[2];
        (parts as any)[5] = null;
      }
      element = {
        url: parts[3],
        func: parts[1] || ErrorTypes.UNKNOWN_FUNCTION,
        args: parts[2] ? parts[2].split(',') : [],
        line: parts[4] ? Number(parts[4]) : null,
        column: parts[5] ? Number(parts[5]) : null,
      };
    }

    if (!element) continue;
    if (!element.func && element.line) element.func = ErrorTypes.UNKNOWN_FUNCTION;
    stack.push(element);
  }

  if (!stack.length) return normal;
  return { ...normal, stack };
}
