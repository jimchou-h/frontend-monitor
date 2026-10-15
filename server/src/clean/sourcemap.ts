import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { SourceMapConsumer } from 'source-map';
import { config } from '../config';
import type { SourceMapRecord, StackFrame, Store } from '../db/types';

export interface ResolveResult {
  stack: StackFrame[];
  applied: boolean;
}

export class SourcemapResolver {
  private consumers = new Map<string, Promise<SourceMapConsumer | null>>();

  constructor(private store: Store) {}

  async resolve(projectId: number, release: string, frames: StackFrame[]): Promise<ResolveResult> {
    let applied = false;
    const stack = await Promise.all(
      frames.map(async (frame) => {
        if (!frame?.url || !/\.js(\?|$)/.test(frame.url)) return frame;
        const fileName = frame.url.split('/').pop()!.replace(/[?#].*$/, '');
        const consumer = await this.getConsumer(projectId, release, fileName);
        if (!consumer || frame.line == null || frame.column == null) return frame;
        try {
          const pos = consumer.originalPositionFor({ line: frame.line, column: frame.column });
          if (pos.source && pos.source !== 'webpack:///') {
            applied = true;
            return {
              ...frame,
              url: pos.source,
              line: pos.line ?? null,
              column: pos.column ?? null,
              mappedFrom: fileName,
            };
          }
        } catch (_e) {
          return frame;
        }
        return frame;
      }),
    );
    return { stack, applied };
  }

  private async getConsumer(projectId: number, release: string, fileName: string): Promise<SourceMapConsumer | null> {
    const cacheKey = `${projectId}:${release}:${fileName}`;
    if (this.consumers.has(cacheKey)) return this.consumers.get(cacheKey)!;
    const promise = this.load(projectId, release, fileName);
    this.consumers.set(cacheKey, promise);
    return promise;
  }

  private async load(projectId: number, release: string, fileName: string): Promise<SourceMapConsumer | null> {
    let record: SourceMapRecord | null = null;
    try {
      record = await this.store.findSourceMap(projectId, release, fileName);
    } catch (_e) {
      return null;
    }
    if (!record) return null;
    try {
      const raw = await readFile(resolve(config.dataDir, record.filePath), 'utf-8');
      return await new SourceMapConsumer(JSON.parse(raw));
    } catch (_e) {
      return null;
    }
  }
}
