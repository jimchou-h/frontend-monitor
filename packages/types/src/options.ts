import { TransportDataType } from './transportData';

export interface InitOptions {
  dsn?: string;
  trackDsn?: string;
  apikey?: string;
  trackKey?: string;
  debug?: boolean;
  maxBreadcrumbs?: number;
  beforePushBreadcrumb?: (breadcrumb: any, data: any) => any;
  beforeDataReport?: (
    data: TransportDataType,
  ) => TransportDataType | null | Promise<TransportDataType | null>;
  configReportXhr?: (xhr: XMLHttpRequest, data: any) => void;
  configReportUrl?: (data: any, url: string) => string;
  configReportRequest?: (requestOptions: any, data: any) => any;
  backTrackerId?: () => string | number;
  useImgUpload?: boolean;

  silentXhr?: boolean;
  silentFetch?: boolean;
  silentConsole?: boolean;
  silentDom?: boolean;
  silentHistory?: boolean;
  silentError?: boolean;
  silentHashchange?: boolean;
  silentUnhandledrejection?: boolean;
  silentUniRequest?: boolean;
  silentUniRoute?: boolean;
  silentUniOnError?: boolean;
  silentUniOnPageNotFound?: boolean;

  enableTraceId?: boolean;
  traceIdFieldName?: string;
  includeHttpUrlTraceIdRegExp?: RegExp;
  filterXhrUrlRegExp?: RegExp;
  throttleDelayTime?: number;
  maxDuplicateCount?: number;

  sampleRate?: number;
  ignoreErrors?: Array<string | RegExp>;
  beforeSend?: (data: any) => any;
  enablePerformance?: boolean;

  appOnLaunch?: Function;
  appOnShow?: Function;
  appOnHide?: Function;
  appOnError?: Function;
  pageOnShow?: Function;
  pageOnHide?: Function;
  pageOnUnload?: Function;
  onPageNotFound?: Function;
  onUnhandledRejection?: Function;
  onShareAppMessage?: Function;
  onShareTimeline?: Function;
  onTabItemTap?: Function;
  triggerUniEvent?: Function;
  onRouteChange?: (from: string, to: string) => void;
}
