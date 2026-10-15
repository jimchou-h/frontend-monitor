export interface UniRequestOptions {
  url: string;
  method?: string;
  data?: any;
  header?: Record<string, string>;
  success?: (res: { statusCode: number; data: any; errMsg?: string }) => void;
  fail?: (err: { errMsg: string }) => void;
  [key: string]: any;
}

export interface UniSystemInfo {
  platform?: string;
  model?: string;
  system?: string;
  language?: string;
  windowWidth?: number;
  windowHeight?: number;
  pixelRatio?: number;
  networkType?: string;
  [key: string]: any;
}
