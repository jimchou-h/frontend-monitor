import { initOptions, options, transportData, log } from '@frontend-monitor/core';
import { SDK_NAME, SDK_VERSION } from '@frontend-monitor/shared';
import type { EActionType, InitOptions, ITrackBaseParam } from '@frontend-monitor/types';
import { _global, getCurrentRoute, getTimestamp, generateUUID } from '@frontend-monitor/utils';
import { collectSystemInfo, setupReplace } from './runtime';
import { initPerformance } from './performance';

const g = _global as any;
let started = false;

export function init(userOptions: InitOptions = {}): void {
  if (!g.uni || started) return;
  started = true;
  initOptions(userOptions);
  collectSystemInfo();
  setupReplace();
  if (userOptions.enablePerformance !== false) initPerformance();
}

export function track(param: ITrackBaseParam & { actionType: EActionType; durationTime?: number; startTime?: number; value?: number }): void {
  if (!g.uni) return;
  const trackData = {
    id: generateUUID(),
    ...param,
    trackTime: getTimestamp(),
    page: param.page || getCurrentRoute(),
  };
  const { beforeSend, sampleRate } = options;
  if (typeof sampleRate === 'number' && sampleRate < 1 && Math.random() > sampleRate) return;
  if (typeof beforeSend === 'function' && !beforeSend(trackData)) return;
  transportData.send(trackData as any);
}

export { log, initOptions, SDK_NAME, SDK_VERSION };
export type { InitOptions, EActionType, ITrackBaseParam };
export default { init, track, log };
