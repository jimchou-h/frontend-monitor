import { EventTypes, HttpTypes, BreadCrumbTypes } from '@frontend-monitor/shared';
import type { MonitorHttp, Replace } from '@frontend-monitor/types';
import { getFlag, getLocationHref, getTimestamp, on, replaceOld, setFlag } from '@frontend-monitor/utils';
import { options, setBrowserAdapters, subscribeEvent, transportData, triggerHandlers } from '@frontend-monitor/core';
import { HandleEvents } from './handleEvents';

let instrumented = false;

export function setupReplace(): void {
  if (instrumented) return;
  instrumented = true;
  setBrowserAdapters({ XHR: window.XMLHttpRequest });

  addHandler(EventTypes.XHR, (data) => HandleEvents.handleHttp(data as MonitorHttp, BreadCrumbTypes.XHR), replaceXHR);
  addHandler(EventTypes.FETCH, (data) => HandleEvents.handleHttp(data as MonitorHttp, BreadCrumbTypes.FETCH), replaceFetch);
  addHandler(EventTypes.ERROR, (data) => HandleEvents.handleError(data as ErrorEvent), replaceError);
  addHandler(EventTypes.UNHANDLEDREJECTION, (data) => HandleEvents.handleUnhandleRejection(data as PromiseRejectionEvent), replaceUnhandledRejection);
  addHandler(EventTypes.HISTORY, (data) => HandleEvents.handleHistory(data as Replace.IRouter), replaceHistory);
  addHandler(EventTypes.HASHCHANGE, (data) => HandleEvents.handleHashchange(data as HashChangeEvent), replaceHashchange);
  addHandler(EventTypes.DOM, (data) => HandleEvents.handleClick(data as MouseEvent), replaceClick);
  addHandler(EventTypes.CONSOLE, (data) => HandleEvents.handleConsole(data as Replace.ITriggerConsole), replaceConsole);
}

function addHandler(type: EventTypes, callback: (data: any) => void, instrument: () => void): void {
  if (subscribeEvent({ type, callback })) {
    instrument();
  }
}

function isIgnoredHttpUrl(url: string): boolean {
  if (!url) return false;
  if (transportData.errorDsn && url.indexOf(transportData.errorDsn) !== -1) return true;
  if (transportData.trackDsn && url.indexOf(transportData.trackDsn) !== -1) return true;
  return !!options.filterXhrUrlRegExp && options.filterXhrUrlRegExp.test(url);
}

function replaceXHR(): void {
  if (!('XMLHttpRequest' in window)) return;
  const originalXhrProto = XMLHttpRequest.prototype;
  replaceOld(originalXhrProto, 'open', (originalOpen: Function) => {
    return function (this: XMLHttpRequest, method: string, url: string): void {
      if (!isIgnoredHttpUrl(url)) {
        (this as any).monitorData = { method, url, type: HttpTypes.XHR, sTime: getTimestamp() };
      }
      return originalOpen.apply(this, arguments as any);
    };
  });
  replaceOld(originalXhrProto, 'send', (originalSend: Function) => {
    return function (this: XMLHttpRequest, body: any): void {
      const data = (this as any).monitorData as MonitorHttp;
      if (data) {
        data.reqData = body;
        this.addEventListener('readystatechange', () => {
          if (this.readyState === 4) {
            const endTime = getTimestamp();
            data.status = this.status;
            data.elapsedTime = endTime - (data.sTime || endTime);
            data.responseText = typeof this.responseText === 'string' ? this.responseText.slice(0, 2048) : '';
            data.time = endTime;
            triggerHandlers(EventTypes.XHR, data);
          }
        });
      }
      return originalSend.apply(this, arguments as any);
    };
  });
  setFlag(EventTypes.XHR, true);
}

function replaceFetch(): void {
  if (!('fetch' in window)) return;
  const originalFetch = window.fetch;
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
    if (isIgnoredHttpUrl(url)) return originalFetch.call(this, input, init);
    const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const data: MonitorHttp = {
      type: HttpTypes.FETCH,
      method,
      url,
      reqData: init?.body || '',
      sTime: getTimestamp(),
    };
    return originalFetch.call(this, input, init).then(
      (response) => {
        const endTime = getTimestamp();
        data.status = response.status;
        data.elapsedTime = endTime - (data.sTime || endTime);
        data.responseText = response.statusText;
        data.time = endTime;
        triggerHandlers(EventTypes.FETCH, data);
        return response;
      },
      (error) => {
        const endTime = getTimestamp();
        data.status = 0;
        data.elapsedTime = endTime - (data.sTime || endTime);
        data.errMsg = String(error?.message || error);
        data.time = endTime;
        triggerHandlers(EventTypes.FETCH, data);
        throw error;
      },
    );
  };
  setFlag(EventTypes.FETCH, true);
}

function replaceError(): void {
  on(window, 'error', (event: ErrorEvent) => triggerHandlers(EventTypes.ERROR, event), true);
  setFlag(EventTypes.ERROR, true);
}

function replaceUnhandledRejection(): void {
  on(window, 'unhandledrejection', (event: PromiseRejectionEvent) => triggerHandlers(EventTypes.UNHANDLEDREJECTION, event), true);
  setFlag(EventTypes.UNHANDLEDREJECTION, true);
}

function replaceHistory(): void {
  const history = window.history;
  if (!history) return;
  replaceOld(history, 'pushState', (original: Function) => {
    return function (this: History, ...args: any[]) {
      const from = getLocationHref();
      const result = original.apply(this, args);
      triggerHandlers(EventTypes.HISTORY, { from, to: getLocationHref() });
      return result;
    };
  });
  replaceOld(history, 'replaceState', (original: Function) => {
    return function (this: History, ...args: any[]) {
      const from = getLocationHref();
      const result = original.apply(this, args);
      triggerHandlers(EventTypes.HISTORY, { from, to: getLocationHref() });
      return result;
    };
  });
  setFlag(EventTypes.HISTORY, true);
}

function replaceHashchange(): void {
  on(window, 'hashchange', (event: HashChangeEvent) => triggerHandlers(EventTypes.HASHCHANGE, event), true);
  setFlag(EventTypes.HASHCHANGE, true);
}

function replaceClick(): void {
  on(document, 'click', (event: MouseEvent) => triggerHandlers(EventTypes.DOM, event), true);
  setFlag(EventTypes.DOM, true);
}

function replaceConsole(): void {
  if (!window.console) return;
  const logType = ['log', 'debug', 'info', 'warn', 'error', 'assert'];
  logType.forEach((level) => {
    if (!(level in console)) return;
    replaceOld(console, level, (original: Function) => {
      return function (...args: any[]) {
        triggerHandlers(EventTypes.CONSOLE, { args, level });
        return original.apply(console, args);
      };
    });
  });
  setFlag(EventTypes.CONSOLE, true);
}
