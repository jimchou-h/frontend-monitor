import { EventTypes, UniEvents } from '@frontend-monitor/shared';
import { getFlag, getFunctionName, logger, setFlag, _support } from '@frontend-monitor/utils';

export type ReplaceCallback = (data: any) => void;

export interface ReplaceHandler {
  type: EventTypes | UniEvents;
  callback: ReplaceCallback;
}

const handlers: Record<string, ReplaceCallback[]> = {};

export function subscribeEvent(handler: ReplaceHandler): boolean {
  if (!handler || getFlag(String(handler.type))) return false;
  setFlag(String(handler.type), true);
  handlers[String(handler.type)] = handlers[String(handler.type)] || [];
  handlers[String(handler.type)].push(handler.callback);
  return true;
}

export function triggerHandlers(type: EventTypes | UniEvents, data: any): void {
  if (!type || !handlers[String(type)]) return;
  handlers[String(type)].forEach((callback) => {
    try {
      callback(data);
    } catch (e) {
      logger.error(`triggerHandlers 回调异常 type=${String(type)} name=${getFunctionName(callback)} error=${String(e)}`);
    }
  });
}

export function getFlagOf(type: EventTypes | UniEvents): boolean {
  return getFlag(String(type));
}

export { _support };
