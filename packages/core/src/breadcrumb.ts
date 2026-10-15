import { BreadCrumbCategory, BreadCrumbTypes, globalVar } from '@frontend-monitor/shared';
import type { BreadcrumbPushData, InitOptions } from '@frontend-monitor/types';
import { getTimestamp, logger, silentConsoleScope, validateOption, _support } from '@frontend-monitor/utils';

export class Breadcrumb {
  maxBreadcrumbs = 30;
  beforePushBreadcrumb: Function | null = null;
  stack: BreadcrumbPushData[] = [];

  push(data: BreadcrumbPushData): void {
    if (typeof this.beforePushBreadcrumb === 'function') {
      let result: BreadcrumbPushData | null = null;
      silentConsoleScope(() => {
        result = this.beforePushBreadcrumb!(this, data);
      });
      if (!result) return;
      this.immediatePush(result);
      return;
    }
    this.immediatePush(data);
  }

  immediatePush(data: BreadcrumbPushData): void {
    if (!data.time) data.time = getTimestamp();
    if (this.stack.length >= this.maxBreadcrumbs) this.shift();
    this.stack.push(data);
    this.stack.sort((a, b) => (a.time || 0) - (b.time || 0));
    logger.log(this.stack);
  }

  shift(): boolean {
    return this.stack.shift() !== undefined;
  }

  clear(): void {
    this.stack = [];
  }

  getStack(): BreadcrumbPushData[] {
    return this.stack;
  }

  getCategory(type: BreadCrumbTypes): BreadCrumbCategory {
    switch (type) {
      case BreadCrumbTypes.XHR:
      case BreadCrumbTypes.FETCH:
      case BreadCrumbTypes.UNI_REQUEST:
        return BreadCrumbCategory.HTTP;
      case BreadCrumbTypes.CLICK:
      case BreadCrumbTypes.ROUTE:
      case BreadCrumbTypes.TAP:
      case BreadCrumbTypes.TOUCHMOVE:
        return BreadCrumbCategory.USER;
      case BreadCrumbTypes.CUSTOMER:
      case BreadCrumbTypes.CONSOLE:
        return BreadCrumbCategory.DEBUG;
      case BreadCrumbTypes.APP_ON_LAUNCH:
      case BreadCrumbTypes.APP_ON_SHOW:
      case BreadCrumbTypes.APP_ON_HIDE:
      case BreadCrumbTypes.PAGE_ON_SHOW:
      case BreadCrumbTypes.PAGE_ON_HIDE:
      case BreadCrumbTypes.PAGE_ON_UNLOAD:
      case BreadCrumbTypes.PAGE_ON_SHARE_APP_MESSAGE:
      case BreadCrumbTypes.PAGE_ON_SHARE_TIMELINE:
      case BreadCrumbTypes.PAGE_ON_TAB_ITEM_TAP:
        return BreadCrumbCategory.LIFECYCLE;
      case BreadCrumbTypes.UNHANDLEDREJECTION:
      case BreadCrumbTypes.CODE_ERROR:
      case BreadCrumbTypes.RESOURCE:
      default:
        return BreadCrumbCategory.EXCEPTION;
    }
  }

  bindOptions(options: InitOptions = {}): void {
    const { maxBreadcrumbs, beforePushBreadcrumb } = options;
    if (validateOption(maxBreadcrumbs, 'maxBreadcrumbs', 'number')) {
      this.maxBreadcrumbs = maxBreadcrumbs as number;
    }
    if (validateOption(beforePushBreadcrumb, 'beforePushBreadcrumb', 'function')) {
      this.beforePushBreadcrumb = beforePushBreadcrumb as Function;
    }
  }
}

const breadcrumb: Breadcrumb = _support.breadcrumb || (_support.breadcrumb = new Breadcrumb());
export { breadcrumb };
