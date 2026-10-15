import { ErrorTypes } from '@frontend-monitor/shared';
import type { TNumStrObj } from '@frontend-monitor/types';
import { Severity, extractErrorStack, getCurrentRoute, getLocationHref, getTimestamp, isError, isUniAppEnv, unknownToString } from '@frontend-monitor/utils';
import { breadcrumb } from './breadcrumb';
import { transportData } from './transportData';
import { BreadCrumbTypes } from '@frontend-monitor/shared';

interface LogTypes {
  message: TNumStrObj;
  tag?: TNumStrObj;
  level?: Severity;
  ex?: Error | any;
  type?: string;
}

export function log({
  message = 'emptyMsg',
  tag = '',
  level = Severity.Critical,
  ex = '',
  type = ErrorTypes.LOG_ERROR,
}: LogTypes): void {
  let errorInfo = {};
  if (isError(ex)) {
    const extracted = extractErrorStack(ex, level);
    if (extracted) errorInfo = extracted;
  }
  const error = {
    type,
    level,
    message: unknownToString(message),
    name: 'Monitor.log',
    customTag: unknownToString(tag),
    time: getTimestamp(),
    url: isUniAppEnv ? getCurrentRoute() : getLocationHref(),
    ...errorInfo,
  };
  breadcrumb.push({
    type: BreadCrumbTypes.CUSTOMER,
    category: breadcrumb.getCategory(BreadCrumbTypes.CUSTOMER),
    data: message,
    level: Severity.fromString(String(level)),
  });
  transportData.send(error);
}
