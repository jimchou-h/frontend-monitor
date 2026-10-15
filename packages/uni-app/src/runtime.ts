import { BreadCrumbTypes, ErrorTypes, EventTypes, UniAppEvents, UniPageEvents, UniRouterEvents, HttpTypes } from '@frontend-monitor/shared';
import type { MonitorHttp, ReportDataType, Replace } from '@frontend-monitor/types';
import {
  breadcrumb,
  options as sdkOptions,
  subscribeEvent,
  transportData,
  triggerHandlers,
  httpTransform,
  setUniAdapters,
} from '@frontend-monitor/core';
import {
  Severity,
  getCurrentRoute,
  getTimestamp,
  isError,
  parseErrorString,
  replaceOld,
  throttle,
  unknownToString,
  _global,
  _support,
  isBrowserEnv,
} from '@frontend-monitor/utils';
import type { UniRequestOptions } from './types';

const g = _global as any;
let instrumented = false;

function getRawUni(): any {
  return g.uni;
}

function isSdkTransportUrl(url: string): boolean {
  return (
    (!!transportData.errorDsn && url.indexOf(transportData.errorDsn) !== -1) ||
    (!!transportData.trackDsn && url.indexOf(transportData.trackDsn) !== -1)
  );
}

function isFilteredUrl(url: string): boolean {
  return !!sdkOptions.filterXhrUrlRegExp && sdkOptions.filterXhrUrlRegExp.test(url);
}

function addHandler(type: EventTypes | UniAppEvents | UniPageEvents | UniRouterEvents, callback: (data: any) => void): void {
  subscribeEvent({ type, callback });
}

export function setupReplace(): void {
  if (instrumented) return;
  instrumented = true;
  const uni = getRawUni();
  if (!uni) return;
  setUniAdapters({ request: uni.request?.bind(uni) || uni.request });

  addHandler(EventTypes.UNI_REQUEST, handleNetwork);
  addHandler(EventTypes.UNI_ROUTE, handleRoute);
  addHandler(UniAppEvents.AppOnError, handleAppError);
  addHandler(UniAppEvents.AppOnUnhandledRejection, handleAppUnhandledRejection);
  addHandler(UniAppEvents.AppOnLaunch, handleLifecycle(BreadCrumbTypes.APP_ON_LAUNCH, sdkOptions.appOnLaunch));
  addHandler(UniAppEvents.AppOnShow, handleLifecycle(BreadCrumbTypes.APP_ON_SHOW, sdkOptions.appOnShow));
  addHandler(UniAppEvents.AppOnHide, handleLifecycle(BreadCrumbTypes.APP_ON_HIDE, sdkOptions.appOnHide));
  addHandler(UniAppEvents.AppOnPageNotFound, handlePageNotFound);
  addHandler(UniPageEvents.PageOnShow, handlePageLifecycle(BreadCrumbTypes.PAGE_ON_SHOW, sdkOptions.pageOnShow));
  addHandler(UniPageEvents.PageOnHide, handlePageLifecycle(BreadCrumbTypes.PAGE_ON_HIDE, sdkOptions.pageOnHide));
  addHandler(UniPageEvents.PageOnUnload, handlePageLifecycle(BreadCrumbTypes.PAGE_ON_UNLOAD, sdkOptions.pageOnUnload));
  addHandler(UniPageEvents.PageOnShareAppMessage, handleShareAppMessage);
  addHandler(UniPageEvents.PageOnShareTimeline, handleShareTimeline);
  addHandler(UniPageEvents.PageOnTabItemTap, handleTabItemTap);
  addHandler(EventTypes.DOM, handleTap);

  replaceApp();
  replacePage();
  replaceComponent();
  replaceNetwork();
  replaceRoute();
  replaceH5Listeners();
}

function replaceApp(): void {
  if (typeof g.App !== 'function') return;
  const originApp = g.App;
  g.App = function (appOptions: any) {
    const hooks: Array<[UniAppEvents, Function]> = [
      [UniAppEvents.AppOnLaunch, sdkOptions.appOnLaunch],
      [UniAppEvents.AppOnShow, sdkOptions.appOnShow],
      [UniAppEvents.AppOnHide, sdkOptions.appOnHide],
      [UniAppEvents.AppOnError, () => undefined],
      [UniAppEvents.AppOnUnhandledRejection, () => undefined],
      [UniAppEvents.AppOnPageNotFound, sdkOptions.onPageNotFound],
    ];
    hooks.forEach(([event, userHook]) => {
      const key = event.replace('AppOn', 'on');
      const origin = appOptions[key];
      appOptions[key] = function (...args: any[]) {
        if (typeof origin === 'function') origin.apply(this, args);
        triggerHandlers(event, args[0]);
      };
    });
    return originApp(appOptions);
  };
}

function replacePage(): void {
  if (typeof g.Page !== 'function') return;
  const originPage = g.Page;
  g.Page = function (pageOptions: any) {
    const hooks: Array<[UniPageEvents, Function]> = [
      [UniPageEvents.PageOnShow, sdkOptions.pageOnShow],
      [UniPageEvents.PageOnHide, sdkOptions.pageOnHide],
      [UniPageEvents.PageOnUnload, sdkOptions.pageOnUnload],
      [UniPageEvents.PageOnShareAppMessage, sdkOptions.onShareAppMessage],
      [UniPageEvents.PageOnShareTimeline, sdkOptions.onShareTimeline],
      [UniPageEvents.PageOnTabItemTap, sdkOptions.onTabItemTap],
    ];
    hooks.forEach(([event, userHook]) => {
      const key = event.replace('PageOn', 'on');
      const origin = pageOptions[key];
      pageOptions[key] = function (...args: any[]) {
        if (typeof origin === 'function') origin.apply(this, args);
        triggerHandlers(event, args[0]);
      };
    });
    wrapMethods(pageOptions);
    return originPage(pageOptions);
  };
}

function replaceComponent(): void {
  if (typeof g.Component !== 'function') return;
  const originComponent = g.Component;
  g.Component = function (componentOptions: any) {
    if (componentOptions?.methods && typeof componentOptions.methods === 'object') {
      wrapMethods(componentOptions.methods);
    }
    return originComponent(componentOptions);
  };
}

function wrapMethods(methods: any): void {
  const throttleGesture = throttle((e: any) => triggerHandlers(EventTypes.DOM, e), sdkOptions.throttleDelayTime || 100);
  Object.keys(methods).forEach((key) => {
    if (typeof methods[key] !== 'function') return;
    replaceOld(methods, key, (origin: Function) => {
      return function (this: any, ...args: any[]) {
        const e = args[0];
        if (e && e.type && e.currentTarget && !e.__monitorWorked__) {
          e.__monitorWorked__ = true;
          if (e.type === 'tap' || e.type === 'touchmove') throttleGesture(e);
        }
        return origin.apply(this, args);
      };
    });
  });
}

function replaceNetwork(): void {
  const uni = getRawUni();
  if (!uni) return;
  const hookMethods = ['request', 'uploadFile', 'downloadFile'];
  hookMethods.forEach((hook) => {
    const origin = uni[hook];
    if (typeof origin !== 'function') return;
    Object.defineProperty(uni, hook, {
      writable: true,
      enumerable: true,
      configurable: true,
      value: function (...args: any[]) {
        const options: UniRequestOptions = args[0] || {};
        let method = (options.method || 'GET').toUpperCase();
        if (hook === 'uploadFile') method = 'POST';
        if (hook === 'downloadFile') method = 'GET';
        if (isSdkTransportUrl(options.url) || isFilteredUrl(options.url)) {
          return origin.apply(uni, args);
        }
        const data: MonitorHttp = {
          type: HttpTypes.UNI_REQUEST,
          method,
          url: options.url,
          reqData: options.data || (hook === 'uploadFile' ? { filePath: options.filePath, name: options.name } : ''),
          sTime: getTimestamp(),
        };
        const actOptions = {
          ...options,
          success: (res: any) => {
            const endTime = getTimestamp();
            data.status = res.statusCode;
            data.responseText = typeof res.data === 'string' || typeof res.data === 'object' ? res.data : '';
            data.errMsg = res.errMsg || '';
            data.elapsedTime = endTime - (data.sTime || endTime);
            data.time = endTime;
            triggerHandlers(EventTypes.UNI_REQUEST, data);
            if (typeof options.success === 'function') return options.success(res);
          },
          fail: (err: any) => {
            const endTime = getTimestamp();
            data.status = 0;
            data.errMsg = err.errMsg || String(err);
            data.elapsedTime = endTime - (data.sTime || endTime);
            data.time = endTime;
            triggerHandlers(EventTypes.UNI_REQUEST, data);
            if (typeof options.fail === 'function') return options.fail(err);
          },
        };
        return origin.apply(uni, [actOptions]);
      },
    });
  });
}

function replaceRoute(): void {
  const uni = getRawUni();
  if (!uni) return;
  const methods = [
    UniRouterEvents.SwitchTab,
    UniRouterEvents.ReLaunch,
    UniRouterEvents.RedirectTo,
    UniRouterEvents.NavigateTo,
    UniRouterEvents.NavigateBack,
    UniRouterEvents.NavigateToMiniProgram,
  ];
  methods.forEach((method) => {
    const origin = uni[method];
    if (typeof origin !== 'function') return;
    Object.defineProperty(uni, method, {
      writable: true,
      enumerable: true,
      configurable: true,
      value: function (options: any = {}) {
        const from = getCurrentRoute();
        let toUrl = method === UniRouterEvents.NavigateBack ? '' : options.url || '';
        if (typeof options.delta === 'number') toUrl = `delta:${options.delta}`;
        const data: Replace.IRouter = { from, to: toUrl };
        const failHandler = (err: any) => {
          const failData: Replace.IRouter = { ...data, isFail: true, message: err.errMsg || String(err) };
          triggerHandlers(EventTypes.UNI_ROUTE, failData);
          if (typeof options.fail === 'function') return options.fail(err);
        };
        const actOptions = { ...options, fail: failHandler };
        return origin.apply(uni, [actOptions]);
      },
    });
  });
}

function replaceH5Listeners(): void {
  if (!isBrowserEnv) return;
  const win = g.window;
  if (!win) return;
  win.addEventListener('error', (event: ErrorEvent) => {
    handleWindowError(event);
  }, true);
  win.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    handleWindowUnhandledRejection(event);
  }, true);
}

function handleNetwork(data: MonitorHttp): void {
  const result = httpTransform(data);
  result.url = getCurrentRoute();
  if (data.status === undefined) result.message = data.errMsg || '';
  const type = BreadCrumbTypes.UNI_REQUEST;
  breadcrumb.push({
    type,
    category: breadcrumb.getCategory(type),
    data: result,
    level: Severity.Info,
  });
  if (data.status === 0 || (data.status || 0) >= 400) {
    breadcrumb.push({
      type,
      category: breadcrumb.getCategory(BreadCrumbTypes.CODE_ERROR),
      data: { ...result },
      level: Severity.Error,
    });
    transportData.send(result);
  }
}

function handleRoute(data: Replace.IRouter): void {
  if (data.isFail) {
    breadcrumb.push({
      type: BreadCrumbTypes.ROUTE,
      category: breadcrumb.getCategory(BreadCrumbTypes.CODE_ERROR),
      data,
      level: Severity.Error,
    });
    transportData.send({
      type: ErrorTypes.ROUTE_ERROR,
      message: data.message || '',
      url: data.to || '',
      name: 'UNI_' + ErrorTypes.ROUTE_ERROR,
      level: Severity.Error,
    });
    return;
  }
  breadcrumb.push({
    type: BreadCrumbTypes.ROUTE,
    category: breadcrumb.getCategory(BreadCrumbTypes.ROUTE),
    data,
    level: Severity.Info,
  });
  sdkOptions.onRouteChange(data.from, data.to);
}

function handleAppError(error: string | Error): void {
  let data: ReportDataType;
  if (isError(error)) {
    const stack = (error as Error).stack;
    const parsed = parseErrorString(stack || (error as Error).message);
    data = parsed
      ? { ...parsed, time: getTimestamp(), level: Severity.Normal, url: getCurrentRoute(), type: ErrorTypes.JAVASCRIPT_ERROR }
      : {
          type: ErrorTypes.JAVASCRIPT_ERROR,
          message: (error as Error).message,
          url: getCurrentRoute(),
          name: (error as Error).name,
          time: getTimestamp(),
          level: Severity.Normal,
        };
  } else {
    const parsed = parseErrorString(String(error));
    data = parsed
      ? { ...parsed, time: getTimestamp(), level: Severity.Normal, url: getCurrentRoute(), type: ErrorTypes.JAVASCRIPT_ERROR }
      : {
          type: ErrorTypes.JAVASCRIPT_ERROR,
          message: String(error),
          url: getCurrentRoute(),
          name: ErrorTypes.UNKNOWN,
          time: getTimestamp(),
          level: Severity.Normal,
        };
  }
  breadcrumb.push({
    type: BreadCrumbTypes.CODE_ERROR,
    category: breadcrumb.getCategory(BreadCrumbTypes.CODE_ERROR),
    data: { ...data },
    level: Severity.Error,
  });
  transportData.send(data);
}

function handleAppUnhandledRejection(ev: any): void {
  let data: ReportDataType = {
    type: ErrorTypes.PROMISE_ERROR,
    message: unknownToString(ev?.reason),
    url: getCurrentRoute(),
    name: 'unhandledrejection',
    time: getTimestamp(),
    level: Severity.Low,
  };
  breadcrumb.push({
    type: BreadCrumbTypes.UNHANDLEDREJECTION,
    category: breadcrumb.getCategory(BreadCrumbTypes.UNHANDLEDREJECTION),
    data: { ...data },
    level: Severity.Error,
  });
  transportData.send(data);
  sdkOptions.onUnhandledRejection(ev);
}

function handlePageNotFound(data: any): void {
  breadcrumb.push({
    type: BreadCrumbTypes.ROUTE,
    category: breadcrumb.getCategory(BreadCrumbTypes.ROUTE),
    data,
    level: Severity.Error,
  });
}

function handleLifecycle(type: BreadCrumbTypes, userHook: Function) {
  return (data: any) => {
    breadcrumb.push({
      type,
      category: breadcrumb.getCategory(type),
      data,
      level: Severity.Info,
    });
    if (typeof userHook === 'function') userHook(data);
  };
}

function handlePageLifecycle(type: BreadCrumbTypes, userHook: Function) {
  return (data: any) => {
    breadcrumb.push({
      type,
      category: breadcrumb.getCategory(type),
      data,
      level: Severity.Info,
    });
    if (typeof userHook === 'function') userHook(data);
  };
}

function handleShareAppMessage(data: any): void {
  breadcrumb.push({
    type: BreadCrumbTypes.PAGE_ON_SHARE_APP_MESSAGE,
    category: breadcrumb.getCategory(BreadCrumbTypes.PAGE_ON_SHARE_APP_MESSAGE),
    data,
    level: Severity.Info,
  });
}

function handleShareTimeline(data: any): void {
  breadcrumb.push({
    type: BreadCrumbTypes.PAGE_ON_SHARE_TIMELINE,
    category: breadcrumb.getCategory(BreadCrumbTypes.PAGE_ON_SHARE_TIMELINE),
    data,
    level: Severity.Info,
  });
}

function handleTabItemTap(data: any): void {
  breadcrumb.push({
    type: BreadCrumbTypes.PAGE_ON_TAB_ITEM_TAP,
    category: breadcrumb.getCategory(BreadCrumbTypes.PAGE_ON_TAB_ITEM_TAP),
    data,
    level: Severity.Info,
  });
}

function handleTap(e: any): void {
  let type = BreadCrumbTypes.TOUCHMOVE;
  if (e.type === 'tap') type = BreadCrumbTypes.TAP;
  breadcrumb.push({
    type,
    category: breadcrumb.getCategory(type),
    data: { target: e.currentTarget?.dataset || e.currentTarget?.id || '' },
    level: Severity.Info,
  });
}

function handleWindowError(event: ErrorEvent): void {
  handleAppError(event.error || new Error(event.message));
}

function handleWindowUnhandledRejection(event: PromiseRejectionEvent): void {
  handleAppUnhandledRejection(event);
}

export function collectSystemInfo(): void {
  const uni = getRawUni();
  if (!uni || typeof uni.getSystemInfoSync !== 'function') return;
  try {
    const info = uni.getSystemInfoSync();
    _support.deviceInfo = {
      platform: info.platform || '',
      model: info.model || '',
      system: info.system || '',
      language: info.language || '',
      clientWidth: info.windowWidth,
      clientHeight: info.windowHeight,
      ratio: info.pixelRatio || 1,
      netType: info.networkType || '',
    };
  } catch (_e) { /* ignore */ }
}
