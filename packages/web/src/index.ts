import { initOptions, options, transportData, log } from '@frontend-monitor/core';
import { SDK_NAME, SDK_VERSION } from '@frontend-monitor/shared';
import type { EActionType, InitOptions, ITrackBaseParam } from '@frontend-monitor/types';
import { _support, getLocationHref, getTimestamp, generateUUID, isBrowserEnv } from '@frontend-monitor/utils';
import { setupReplace } from './instrument';
import { initWebVitals, VitalReport } from './performance';

let started = false;

function collectDeviceInfo(): void {
  if (!_support.deviceInfo) {
    _support.deviceInfo = {
      clientWidth: window.innerWidth,
      clientHeight: window.innerHeight,
      ratio: window.devicePixelRatio || 1,
      netType: (navigator as any).connection?.effectiveType || '',
      language: navigator.language || '',
      platform: navigator.platform || '',
    };
  }
}

function shouldSend(data: any): boolean {
  const { ignoreErrors, beforeSend, sampleRate } = options;
  if (data?.type) {
    const message = String(data.message || '');
    const name = String(data.name || '');
    if (ignoreErrors.some((item) => (typeof item === 'string' ? message.includes(item) || name.includes(item) : item.test(message) || item.test(name)))) {
      return false;
    }
  }
  if (typeof sampleRate === 'number' && sampleRate < 1 && Math.random() > sampleRate) {
    return false;
  }
  if (typeof beforeSend === 'function') {
    return beforeSend(data) !== null;
  }
  return true;
}

export function init(userOptions: InitOptions = {}): void {
  if (!isBrowserEnv || started) return;
  started = true;
  initOptions(userOptions);
  collectDeviceInfo();
  setupReplace();
  if (userOptions.enablePerformance !== false) {
    initWebVitals((report: VitalReport) => {
      if (shouldSend(report)) transportData.send(report as any);
    });
  }
}

export function track(param: ITrackBaseParam & { actionType: EActionType; durationTime?: number; startTime?: number; value?: number }): void {
  if (!isBrowserEnv) return;
  const trackData = {
    id: generateUUID(),
    ...param,
    trackTime: getTimestamp(),
    page: param.page || getLocationHref(),
  };
  if (shouldSend(trackData)) transportData.send(trackData as any);
}

export function flush(): void {
  transportData.queue.getStack().forEach((fn) => fn());
  transportData.queue.clear();
}

export { MonitorVue, vueRouterPlugin } from './vue';
export { initOptions, log, SDK_NAME, SDK_VERSION };
export type { InitOptions, EActionType, ITrackBaseParam };
export default { init, track, log, flush };
