import { BreadCrumbTypes, ErrorTypes, HttpCodes, ERROR_TYPE_RE } from '@frontend-monitor/shared';
import { transportData, breadcrumb, httpTransform, resourceTransform, options } from '@frontend-monitor/core';
import type { MonitorHttp, ReportDataType, Replace, ResourceErrorTarget } from '@frontend-monitor/types';
import {
  Severity,
  extractErrorStack,
  getLocationHref,
  getTimestamp,
  isError,
  parseUrlToObj,
  unknownToString,
  htmlElementAsString,
} from '@frontend-monitor/utils';

function isHttpError(data: MonitorHttp): boolean {
  return (
    data.status === 0 ||
    data.status === HttpCodes.BAD_REQUEST ||
    (data.status || 0) > HttpCodes.UNAUTHORIZED
  );
}

function pushHttpBreadcrumb(data: MonitorHttp, type: BreadCrumbTypes, level: Severity): void {
  const result = httpTransform(data);
  breadcrumb.push({
    type,
    category: breadcrumb.getCategory(type),
    data: { ...result },
    level,
    time: data.time,
  });
}

export const HandleEvents = {
  handleHttp(data: MonitorHttp, type: BreadCrumbTypes): void {
    const result = httpTransform(data);
    pushHttpBreadcrumb(data, type, Severity.Info);
    if (isHttpError(data)) {
      breadcrumb.push({
        type,
        category: breadcrumb.getCategory(BreadCrumbTypes.CODE_ERROR),
        data: { ...result },
        level: Severity.Error,
      });
      transportData.send(result);
    }
  },

  handleError(errorEvent: ErrorEvent): void {
    const target = errorEvent.target as ResourceErrorTarget;
    if (target && target.localName) {
      const data = resourceTransform(target);
      breadcrumb.push({
        type: BreadCrumbTypes.RESOURCE,
        category: breadcrumb.getCategory(BreadCrumbTypes.RESOURCE),
        data,
        level: Severity.Error,
      });
      transportData.send(data);
      return;
    }

    const { message, filename, lineno, colno, error } = errorEvent;
    let result: ReportDataType | null = null;
    if (error && isError(error)) {
      result = extractErrorStack(error, Severity.Normal);
    }
    if (!result) {
      result = handleNotErrorInstance(message, filename, lineno, colno);
    }
    result.type = ErrorTypes.JAVASCRIPT_ERROR;
    breadcrumb.push({
      type: BreadCrumbTypes.CODE_ERROR,
      category: breadcrumb.getCategory(BreadCrumbTypes.CODE_ERROR),
      data: { ...result },
      level: Severity.Error,
    });
    transportData.send(result);
  },

  handleUnhandleRejection(ev: PromiseRejectionEvent): void {
    let data: ReportDataType = {
      type: ErrorTypes.PROMISE_ERROR,
      message: unknownToString(ev.reason),
      url: getLocationHref(),
      name: ev.type,
      time: getTimestamp(),
      level: Severity.Low,
    };
    if (isError(ev.reason)) {
      const extracted = extractErrorStack(ev.reason, Severity.Low);
      if (extracted) data = { ...data, ...extracted };
    }
    breadcrumb.push({
      type: BreadCrumbTypes.UNHANDLEDREJECTION,
      category: breadcrumb.getCategory(BreadCrumbTypes.UNHANDLEDREJECTION),
      data: { ...data },
      level: Severity.Error,
    });
    transportData.send(data);
  },

  handleHistory(data: Replace.IRouter): void {
    const { from, to } = data;
    const { relative: parsedFrom } = parseUrlToObj(from || '');
    const { relative: parsedTo } = parseUrlToObj(to || '');
    breadcrumb.push({
      type: BreadCrumbTypes.ROUTE,
      category: breadcrumb.getCategory(BreadCrumbTypes.ROUTE),
      data: { from: parsedFrom || '/', to: parsedTo || '/' },
      level: Severity.Info,
    });
    options.onRouteChange(from, to);
  },

  handleHashchange(data: HashChangeEvent): void {
    const { oldURL, newURL } = data;
    const { relative: from } = parseUrlToObj(oldURL);
    const { relative: to } = parseUrlToObj(newURL);
    breadcrumb.push({
      type: BreadCrumbTypes.ROUTE,
      category: breadcrumb.getCategory(BreadCrumbTypes.ROUTE),
      data: { from, to },
      level: Severity.Info,
    });
    options.onRouteChange(from, to);
  },

  handleClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target) return;
    breadcrumb.push({
      type: BreadCrumbTypes.CLICK,
      category: breadcrumb.getCategory(BreadCrumbTypes.CLICK),
      data: { target: htmlElementAsString(target) },
      level: Severity.Info,
    });
  },

  handleConsole(data: Replace.ITriggerConsole): void {
    breadcrumb.push({
      type: BreadCrumbTypes.CONSOLE,
      category: breadcrumb.getCategory(BreadCrumbTypes.CONSOLE),
      data,
      level: Severity.fromString(data.level),
    });
  },
};

function handleNotErrorInstance(message: string, filename: string, lineno: number, colno: number): ReportDataType {
  let name: string = ErrorTypes.UNKNOWN;
  const url = filename || getLocationHref();
  let msg = message;
  const matches = message.match(ERROR_TYPE_RE);
  if (matches && matches[1]) {
    name = matches[1];
    msg = matches[2];
  }
  return {
    url,
    name,
    message: msg,
    level: Severity.Normal,
    time: getTimestamp(),
    stack: [
      {
        url,
        func: ErrorTypes.UNKNOWN_FUNCTION,
        args: [],
        line: lineno,
        col: colno,
      } as any,
    ],
  };
}
