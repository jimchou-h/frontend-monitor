import { VoidFun } from '@frontend-monitor/shared';

export class Queue {
  private stack: VoidFun[] = [];
  private running = 0;

  constructor(private maxConcurrency = 3) {}

  addFn(fn: VoidFun): void {
    if (typeof fn !== 'function') return;
    this.stack.push(fn);
    this.drain();
  }

  private drain(): void {
    while (this.running < this.maxConcurrency && this.stack.length > 0) {
      const fn = this.stack.shift()!;
      this.running++;
      Promise.resolve()
        .then(fn)
        .catch(() => undefined)
        .finally(() => {
          this.running--;
          this.drain();
        });
    }
  }

  clear(): void {
    this.stack = [];
  }

  getStack(): VoidFun[] {
    return this.stack;
  }
}
