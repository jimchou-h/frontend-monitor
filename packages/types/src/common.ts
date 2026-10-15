export interface IAnyObject {
  [key: string]: any;
}

export type TNumStrObj = number | string | object;

export interface ErrorStack {
  args?: any[];
  func: string;
  column: number | null;
  line: number | null;
  url: string | null;
  mappedFrom?: string | null;
}

export interface IntegrationError {
  message: string;
  name: string;
  stack: ErrorStack[];
}

export interface ResourceErrorTarget {
  src?: string;
  href?: string;
  localName?: string;
}

export interface MonitorHttp {
  type: string;
  traceId?: string;
  method?: string;
  url?: string;
  status?: number;
  reqData?: any;
  sTime?: number;
  elapsedTime?: number;
  responseText?: any;
  time?: number;
  isSdkUrl?: boolean;
  errMsg?: string;
}

export interface DeviceInfo {
  platform?: string;
  netType?: string;
  clientWidth?: number;
  clientHeight?: number;
  ratio?: number;
  language?: string;
  model?: string;
  system?: string;
  [key: string]: any;
}

export interface LocalStorageValue<T = any> {
  expireTime?: number;
  value: T | string;
}
