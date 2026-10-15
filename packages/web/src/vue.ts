import { BreadCrumbTypes, ErrorTypes } from '@frontend-monitor/shared';
import type { ReportDataType } from '@frontend-monitor/types';
import { breadcrumb, transportData } from '@frontend-monitor/core';
import {
  Severity,
  extractErrorStack,
  getLocationHref,
  getTimestamp,
  unknownToString,
} from '@frontend-monitor/utils';

function componentName(instance: any, info?: string): string {
  if (!instance) return info || 'VueComponent';
  return (
    instance.$options?.name ||
    instance.$options?._componentTag ||
    instance.$root?.$options?.name ||
    info ||
    'VueComponent'
  );
}

function reportVueError(err: any, instance: any, info: string): void {
  const extracted = extractErrorStack(err, Severity.Normal);
  const report: ReportDataType = {
    ...(extracted || {
      url: getLocationHref(),
      name: err?.name || 'VueError',
      level: Severity.Normal,
      message: unknownToString(err?.message || err),
      time: getTimestamp(),
    }),
    type: ErrorTypes.VUE_ERROR,
    componentName: componentName(instance, info),
  };
  if (instance?.$props) report.propsData = instance.$props;

  breadcrumb.push({
    type: BreadCrumbTypes.CODE_ERROR,
    category: breadcrumb.getCategory(BreadCrumbTypes.CODE_ERROR),
    data: { ...report },
    level: Severity.Error,
  });
  transportData.send(report);
}

/**
 * Vue 3: MonitorVue(app)；Vue 2: MonitorVue(Vue)。
 * 组件错误经 Vue 的 errorHandler 进入监控上报，补充组件名与 props。
 */
export function MonitorVue(appOrVue: any): void {
  if (!appOrVue || !appOrVue.config) return;
  appOrVue.config.errorHandler = (err: any, instance: any, info: string) =>
    reportVueError(err, instance, info);
}

/**
 * 接入 vue-router 后，路由跳转写进用户行为栈（优先用路由 name）。
 */
export function vueRouterPlugin(router: any): void {
  if (!router || typeof router.afterEach !== 'function') return;
  router.afterEach((to: any, from: any) => {
    const toName = to?.name || to?.path || String(to?.fullPath || '');
    const fromName = from?.name || from?.path || String(from?.fullPath || '');
    breadcrumb.push({
      type: BreadCrumbTypes.ROUTE,
      category: breadcrumb.getCategory(BreadCrumbTypes.ROUTE),
      data: { from: fromName || '/', to: toName || '/' },
      level: Severity.Info,
    });
  });
}
