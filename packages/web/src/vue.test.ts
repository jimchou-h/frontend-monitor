import { describe, expect, it } from 'vitest';
import { breadcrumb } from '@frontend-monitor/core';
import { MonitorVue, vueRouterPlugin } from './vue';

describe('vue integration', () => {
  it('installs errorHandler and reports VUE_ERROR with component name', () => {
    const app: any = { config: {} };
    MonitorVue(app);
    expect(typeof app.config.errorHandler).toBe('function');

    app.config.errorHandler(
      new TypeError('boom'),
      { $options: { name: 'PayButton' }, $props: { amount: 99 } },
      'render',
    );
    const last = breadcrumb.getStack()[breadcrumb.getStack().length - 1];
    expect(last.type).toBe('Code Error');
    expect(last.data.type).toBe('VUE_ERROR');
    expect(last.data.componentName).toBe('PayButton');
  });

  it('records route changes via vue-router afterEach', () => {
    const router: any = {
      afterEach: (fn: Function) => {
        router.hook = fn;
      },
    };
    vueRouterPlugin(router);
    router.hook({ name: 'cart' }, { name: 'home' });
    const last = breadcrumb.getStack()[breadcrumb.getStack().length - 1];
    expect(last.type).toBe('Route');
    expect(last.data.to).toBe('cart');
    expect(last.data.from).toBe('home');
  });
});
