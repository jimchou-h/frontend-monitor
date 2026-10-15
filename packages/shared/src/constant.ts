export type VoidFun = () => void;

export enum ErrorTypes {
  UNKNOWN = 'UNKNOWN',
  UNKNOWN_FUNCTION = 'UNKNOWN_FUNCTION',
  JAVASCRIPT_ERROR = 'JAVASCRIPT_ERROR',
  LOG_ERROR = 'LOG_ERROR',
  HTTP_ERROR = 'HTTP_ERROR',
  RESOURCE_ERROR = 'RESOURCE_ERROR',
  PROMISE_ERROR = 'PROMISE_ERROR',
  ROUTE_ERROR = 'ROUTE_ERROR',
  VUE_ERROR = 'VUE_ERROR',
  REACT_ERROR = 'REACT_ERROR',
}

export enum UniAppEvents {
  AppOnLaunch = 'AppOnLaunch',
  AppOnShow = 'AppOnShow',
  AppOnHide = 'AppOnHide',
  AppOnError = 'AppOnError',
  AppOnPageNotFound = 'AppOnPageNotFound',
  AppOnUnhandledRejection = 'AppOnUnhandledRejection',
}

export enum UniPageEvents {
  PageOnLoad = 'PageOnLoad',
  PageOnShow = 'PageOnShow',
  PageOnHide = 'PageOnHide',
  PageOnUnload = 'PageOnUnload',
  PageOnShareAppMessage = 'PageOnShareAppMessage',
  PageOnShareTimeline = 'PageOnShareTimeline',
  PageOnTabItemTap = 'PageOnTabItemTap',
}

export enum UniRouterEvents {
  SwitchTab = 'switchTab',
  ReLaunch = 'reLaunch',
  RedirectTo = 'redirectTo',
  NavigateTo = 'navigateTo',
  NavigateBack = 'navigateBack',
  NavigateToMiniProgram = 'navigateToMiniProgram',
}

export type UniEvents = UniAppEvents | UniPageEvents | UniRouterEvents;

export enum BreadCrumbTypes {
  ROUTE = 'Route',
  CLICK = 'Click',
  CONSOLE = 'Console',
  XHR = 'Xhr',
  FETCH = 'Fetch',
  UNI_REQUEST = 'UniRequest',
  UNHANDLEDREJECTION = 'Unhandledrejection',
  RESOURCE = 'Resource',
  CODE_ERROR = 'Code Error',
  CUSTOMER = 'Customer',
  APP_ON_LAUNCH = 'App On Launch',
  APP_ON_SHOW = 'App On Show',
  APP_ON_HIDE = 'App On Hide',
  PAGE_ON_SHOW = 'Page On Show',
  PAGE_ON_HIDE = 'Page On Hide',
  PAGE_ON_UNLOAD = 'Page On Unload',
  PAGE_ON_SHARE_APP_MESSAGE = 'Page On Share App Message',
  PAGE_ON_SHARE_TIMELINE = 'Page On Share Timeline',
  PAGE_ON_TAB_ITEM_TAP = 'Page On Tab Item Tap',
  TAP = 'Tap',
  TOUCHMOVE = 'Touchmove',
}

export enum BreadCrumbCategory {
  HTTP = 'http',
  USER = 'user',
  DEBUG = 'debug',
  EXCEPTION = 'exception',
  LIFECYCLE = 'lifecycle',
}

export enum EventTypes {
  XHR = 'xhr',
  FETCH = 'fetch',
  CONSOLE = 'console',
  DOM = 'dom',
  HISTORY = 'history',
  ERROR = 'error',
  HASHCHANGE = 'hashchange',
  UNHANDLEDREJECTION = 'unhandledrejection',
  UNI_REQUEST = 'uniRequest',
  UNI_ROUTE = 'uniRoute',
  MONITOR = 'monitor',
}

export enum HttpTypes {
  XHR = 'xhr',
  FETCH = 'fetch',
  UNI_REQUEST = 'uni.request',
}

export enum HttpCodes {
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  INTERNAL_EXCEPTION = 500,
}

export const ERROR_TYPE_RE =
  /^(?:[Uu]ncaught (?:exception: )?)?(?:((?:Eval|Internal|Range|Reference|Syntax|Type|URI|)Error): )?(.*)$/;

export const globalVar = {
  isLogAddBreadcrumb: true,
  crossOriginThreshold: 1000,
};
