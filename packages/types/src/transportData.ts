import { BreadcrumbPushData } from './breadcrumb';
import { DeviceInfo } from './common';
import { EActionType, TrackReportData } from './track';

export interface AuthInfo {
  apikey?: string;
  trackKey?: string;
  sdkVersion: string;
  sdkName: string;
  trackerId: string;
}

export interface TransportDataType {
  authInfo: AuthInfo;
  breadcrumb?: BreadcrumbPushData[];
  data?: FinalReportType;
  record?: any[];
  deviceInfo?: DeviceInfo;
}

export type FinalReportType = ReportDataType | TrackReportData;

interface ICommonDataType {
  isTrackData?: boolean;
}

export interface ReportDataType extends ICommonDataType {
  type?: string;
  message?: string;
  url: string;
  page?: string;
  name?: string;
  stack?: any;
  time?: number;
  errorId?: number;
  level: string;
  release?: string;
  elapsedTime?: number;
  request?: {
    httpType?: string;
    traceId?: string;
    method: string;
    url: string;
    data: any;
  };
  response?: {
    status: number;
    data: string;
  };
  componentName?: string;
  propsData?: any;
  customTag?: string;
}

export function isReportDataType(data: FinalReportType): data is ReportDataType {
  return (data as TrackReportData).actionType === undefined && !data.isTrackData;
}

export { EActionType };
export type { TrackReportData };
