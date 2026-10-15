import { ErrorTypes, EventTypes } from '@frontend-monitor/shared';
import type { ReportDataType } from '@frontend-monitor/types';
import { variableTypeDetection } from '@frontend-monitor/utils';
import { options } from './options';

const allErrorNumber: Record<string, number> = {};

export function createErrorId(data: ReportDataType, apikey: string): number | null {
  let id: string;
  switch (data.type) {
    case ErrorTypes.HTTP_ERROR:
      id = (data.type || '') + (data.request?.method || '') + (data.response?.status || 0) + getRealPath(data.request?.url || '') + apikey;
      break;
    case ErrorTypes.JAVASCRIPT_ERROR:
    case ErrorTypes.VUE_ERROR:
    case ErrorTypes.REACT_ERROR:
      id = (data.type || '') + (data.name || '') + (data.message || '') + apikey;
      break;
    case ErrorTypes.LOG_ERROR:
      id = (data.customTag || '') + (data.type || '') + (data.name || '') + apikey;
      break;
    case ErrorTypes.PROMISE_ERROR:
      id = generatePromiseErrorId(data, apikey);
      break;
    default:
      id = (data.type || '') + (data.message || '') + apikey;
      break;
  }
  const hash = hashCode(id);
  if (allErrorNumber[hash] >= options.maxDuplicateCount) return null;
  allErrorNumber[hash] = typeof allErrorNumber[hash] === 'number' ? allErrorNumber[hash] + 1 : 1;
  return hash;
}

function generatePromiseErrorId(data: ReportDataType, apikey: string): string {
  const locationUrl = getRealPath(data.url);
  if (data.name === EventTypes.UNHANDLEDREJECTION) {
    return data.type + objectOrder(data.message) + apikey;
  }
  return (data.type || '') + (data.name || '') + objectOrder(data.message || '') + locationUrl;
}

function objectOrder(reason: any): string {
  if (typeof reason !== 'string' || !/\{.*\}/.test(reason)) return reason;
  try {
    const sortFn = (obj: any): any => {
      if (!variableTypeDetection.isObject(obj)) return obj;
      return Object.keys(obj)
        .sort()
        .reduce((total: any, key) => {
          total[key] = sortFn(obj[key]);
          return total;
        }, {});
    };
    return JSON.stringify(sortFn(JSON.parse(reason)));
  } catch (_e) {
    return reason;
  }
}

export function getRealPath(url: string): string {
  return url
    .replace(/[\?#].*$/, '')
    .replace(/\/\d+([/]*$)/, '{param}$1');
}

export function hashCode(str: string): number {
  let hash = 0;
  if (str.length === 0) return hash;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash;
}
