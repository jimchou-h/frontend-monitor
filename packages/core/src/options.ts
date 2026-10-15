import { InitOptions } from '@frontend-monitor/types';
import { logger, validateOption, toStringValidateOption, _support, setFlag } from '@frontend-monitor/utils';
import { EventTypes, UniAppEvents, UniPageEvents } from '@frontend-monitor/shared';
import { breadcrumb } from './breadcrumb';
import { transportData } from './transportData';

export class Options {
  dsn = '';
  trackDsn = '';
  apikey = '';
  trackKey = '';
  debug = false;
  maxBreadcrumbs = 30;
  beforeDataReport: Function | null = null;
  configReportXhr: Function | null = null;
  configReportUrl: Function | null = null;
  configReportRequest: Function | null = null;
  backTrackerId: Function | null = null;
  useImgUpload = false;
  sampleRate = 1;
  ignoreErrors: Array<string | RegExp> = [];
  beforeSend: Function | null = null;
  filterXhrUrlRegExp: RegExp | null = null;
  enableTraceId = false;
  traceIdFieldName = 'Trace-Id';
  includeHttpUrlTraceIdRegExp: RegExp | null = null;
  throttleDelayTime = 0;
  maxDuplicateCount = 2;

  appOnLaunch: Function = () => undefined;
  appOnShow: Function = () => undefined;
  appOnHide: Function = () => undefined;
  appOnError: Function = () => undefined;
  pageOnShow: Function = () => undefined;
  pageOnHide: Function = () => undefined;
  pageOnUnload: Function = () => undefined;
  onPageNotFound: Function = () => undefined;
  onUnhandledRejection: Function = () => undefined;
  onShareAppMessage: Function = () => undefined;
  onShareTimeline: Function = () => undefined;
  onTabItemTap: Function = () => undefined;
  triggerUniEvent: Function = () => undefined;
  onRouteChange: Function = () => undefined;

  bindOptions(options: InitOptions = {}): void {
    const assign = (key: keyof InitOptions, expectType: string) => {
      const value = options[key];
      if (value === undefined) return;
      if (expectType === 'string' || expectType === 'number' || expectType === 'boolean') {
        if (validateOption(value, key as string, expectType)) (this as any)[key] = value;
      } else if (expectType === 'regexp') {
        if (toStringValidateOption(value, key as string, '[object RegExp]')) (this as any)[key] = value;
      } else if (expectType === 'function') {
        if (validateOption(value, key as string, 'function')) (this as any)[key] = value;
      } else if (expectType === 'array') {
        if (Array.isArray(value)) (this as any)[key] = value;
      } else {
        (this as any)[key] = value;
      }
    };

    assign('dsn', 'string');
    assign('trackDsn', 'string');
    assign('apikey', 'string');
    assign('trackKey', 'string');
    assign('debug', 'boolean');
    assign('maxBreadcrumbs', 'number');
    assign('beforeDataReport', 'function');
    assign('configReportXhr', 'function');
    assign('configReportUrl', 'function');
    assign('configReportRequest', 'function');
    assign('backTrackerId', 'function');
    assign('useImgUpload', 'boolean');
    assign('sampleRate', 'number');
    assign('ignoreErrors', 'array');
    assign('beforeSend', 'function');
    assign('filterXhrUrlRegExp', 'regexp');
    assign('enableTraceId', 'boolean');
    assign('traceIdFieldName', 'string');
    assign('includeHttpUrlTraceIdRegExp', 'regexp');
    assign('throttleDelayTime', 'number');
    assign('maxDuplicateCount', 'number');
    assign('appOnLaunch', 'function');
    assign('appOnShow', 'function');
    assign('appOnHide', 'function');
    assign('appOnError', 'function');
    assign('pageOnShow', 'function');
    assign('pageOnHide', 'function');
    assign('pageOnUnload', 'function');
    assign('onPageNotFound', 'function');
    assign('onUnhandledRejection', 'function');
    assign('onShareAppMessage', 'function');
    assign('onShareTimeline', 'function');
    assign('onTabItemTap', 'function');
    assign('triggerUniEvent', 'function');
    assign('onRouteChange', 'function');
  }
}

export function setSilentFlags(options: InitOptions = {}): void {
  setFlag(EventTypes.XHR, !!options.silentXhr);
  setFlag(EventTypes.FETCH, !!options.silentFetch);
  setFlag(EventTypes.CONSOLE, !!options.silentConsole);
  setFlag(EventTypes.DOM, !!options.silentDom);
  setFlag(EventTypes.HISTORY, !!options.silentHistory);
  setFlag(EventTypes.ERROR, !!options.silentError);
  setFlag(EventTypes.HASHCHANGE, !!options.silentHashchange);
  setFlag(EventTypes.UNHANDLEDREJECTION, !!options.silentUnhandledrejection);
  setFlag(EventTypes.UNI_REQUEST, !!options.silentUniRequest);
  setFlag(EventTypes.UNI_ROUTE, !!options.silentUniRoute);
  setFlag(UniAppEvents.AppOnError, !!options.silentUniOnError);
  setFlag(UniAppEvents.AppOnPageNotFound, !!options.silentUniOnPageNotFound);
  setFlag(UniPageEvents.PageOnShareAppMessage, !!options.silentUniOnPageNotFound);
}

const options: Options = _support.options || (_support.options = new Options());

export function initOptions(paramOptions: InitOptions = {}): void {
  setSilentFlags(paramOptions);
  breadcrumb.bindOptions(paramOptions);
  logger.bindOptions(paramOptions.debug);
  transportData.bindOptions(paramOptions);
  options.bindOptions(paramOptions);
}

export { options };
