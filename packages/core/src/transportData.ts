import { SDK_NAME, SDK_VERSION } from '@frontend-monitor/shared';
import type {
  AuthInfo,
  DeviceInfo,
  FinalReportType,
  InitOptions,
  ReportDataType,
  TransportDataType,
} from '@frontend-monitor/types';
import { isReportDataType } from '@frontend-monitor/types';
import { Queue, isEmpty, isBrowserEnv, isUniAppEnv, logger, validateOption, _support } from '@frontend-monitor/utils';
import { breadcrumb } from './breadcrumb';
import { createErrorId } from './errorId';

interface BrowserAdapters {
  XHR?: typeof XMLHttpRequest;
}

interface UniAdapters {
  request?: (options: any) => void;
}

let browserAdapters: BrowserAdapters = {};
let uniAdapters: UniAdapters = {};

export function setBrowserAdapters(adapters: BrowserAdapters): void {
  browserAdapters = adapters;
}

export function setUniAdapters(adapters: UniAdapters): void {
  uniAdapters = adapters;
}

export class TransportData {
  queue = new Queue();
  apikey = '';
  trackKey = '';
  errorDsn = '';
  trackDsn = '';
  useImgUpload = false;
  beforeDataReport: Function | null = null;
  backTrackerId: Function | null = null;
  configReportXhr: Function | null = null;
  configReportUrl: Function | null = null;
  configReportRequest: Function | null = null;

  getAuthInfo(): AuthInfo {
    const trackerId = this.getTrackerId();
    const result: AuthInfo = {
      trackerId: String(trackerId),
      sdkVersion: SDK_VERSION,
      sdkName: SDK_NAME,
    };
    if (this.apikey) result.apikey = this.apikey;
    if (this.trackKey) result.trackKey = this.trackKey;
    return result;
  }

  getTrackerId(): string {
    if (typeof this.backTrackerId === 'function') {
      const trackerId = this.backTrackerId();
      if (typeof trackerId === 'string' || typeof trackerId === 'number') {
        return String(trackerId);
      }
    }
    return '';
  }

  getDeviceInfo(): DeviceInfo {
    return _support.deviceInfo || {};
  }

  async beforePost(data: FinalReportType): Promise<TransportDataType | null> {
    if (isReportDataType(data) && this.apikey) {
      const errorId = createErrorId(data, this.apikey);
      if (!errorId) return null;
      (data as ReportDataType).errorId = errorId;
    }
    let transportData = this.getTransportData(data);
    if (typeof this.beforeDataReport === 'function') {
      transportData = await this.beforeDataReport(transportData);
      if (!transportData) return null;
    }
    return transportData;
  }

  getTransportData(data: FinalReportType): TransportDataType {
    return {
      authInfo: this.getAuthInfo(),
      breadcrumb: breadcrumb.getStack(),
      data,
      record: _support.record || [],
      deviceInfo: this.getDeviceInfo(),
    };
  }

  async send(data: FinalReportType): Promise<void> {
    let dsn = '';
    if (isReportDataType(data)) {
      dsn = this.errorDsn;
      if (isEmpty(dsn)) {
        logger.error('dsn为空，没有传入错误上报地址，请在 init 中传入 dsn');
        return;
      }
    } else {
      dsn = this.trackDsn;
      if (isEmpty(dsn)) {
        logger.error('trackDsn为空，没有传入埋点上报地址，请在 init 中传入 trackDsn');
        return;
      }
    }

    const result = await this.beforePost(data);
    if (!result) return;
    if (typeof this.configReportUrl === 'function') {
      const next = this.configReportUrl(result, dsn);
      if (!next) return;
      dsn = next;
    }

    if (isBrowserEnv) {
      this.useImgUpload ? this.imgRequest(result, dsn) : this.xhrPost(result, dsn);
    } else if (isUniAppEnv) {
      this.uniPost(result, dsn);
    }
  }

  private imgRequest(data: TransportDataType, url: string): void {
    this.queue.addFn(() => {
      const img = new Image();
      const spliceStr = url.indexOf('?') === -1 ? '?' : '&';
      img.src = `${url}${spliceStr}data=${encodeURIComponent(JSON.stringify(data))}`;
    });
  }

  private xhrPost(data: TransportDataType, url: string): void {
    this.queue.addFn(() => {
      const XHR = browserAdapters.XHR || XMLHttpRequest;
      const xhr = new XHR();
      xhr.open('POST', url);
      xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
      xhr.withCredentials = true;
      if (typeof this.configReportXhr === 'function') {
        this.configReportXhr(xhr, data);
      }
      xhr.send(JSON.stringify(data));
    });
  }

  private uniPost(data: TransportDataType, url: string): void {
    this.queue.addFn(() => {
      const request = uniAdapters.request || ((globalThis as any).uni?.request);
      if (typeof request !== 'function') {
        logger.error('uni.request 不可用，无法上报');
        return;
      }
      let requestOptions: any = {
        url,
        method: 'POST',
        data: JSON.stringify(data),
        header: { 'Content-Type': 'application/json' },
      };
      if (typeof this.configReportRequest === 'function') {
        const configured = this.configReportRequest(requestOptions, data);
        if (configured) requestOptions = configured;
      }
      request(requestOptions);
    });
  }

  bindOptions(options: InitOptions = {}): void {
    const { dsn, trackDsn, apikey, trackKey, useImgUpload, beforeDataReport, backTrackerId, configReportXhr, configReportUrl, configReportRequest } = options;
    validateOption(apikey, 'apikey', 'string') && (this.apikey = apikey as string);
    validateOption(trackKey, 'trackKey', 'string') && (this.trackKey = trackKey as string);
    validateOption(dsn, 'dsn', 'string') && (this.errorDsn = dsn as string);
    validateOption(trackDsn, 'trackDsn', 'string') && (this.trackDsn = trackDsn as string);
    validateOption(useImgUpload, 'useImgUpload', 'boolean') && (this.useImgUpload = useImgUpload as boolean);
    validateOption(beforeDataReport, 'beforeDataReport', 'function') && (this.beforeDataReport = beforeDataReport as Function);
    validateOption(backTrackerId, 'backTrackerId', 'function') && (this.backTrackerId = backTrackerId as Function);
    validateOption(configReportXhr, 'configReportXhr', 'function') && (this.configReportXhr = configReportXhr as Function);
    validateOption(configReportUrl, 'configReportUrl', 'function') && (this.configReportUrl = configReportUrl as Function);
    validateOption(configReportRequest, 'configReportRequest', 'function') && (this.configReportRequest = configReportRequest as Function);
  }
}

const transportData: TransportData = _support.transportData || (_support.transportData = new TransportData());
export { transportData };
