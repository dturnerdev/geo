import {
  domainEventSchema,
  eventContextSchema,
  type ContextId,
  type DomainEvent,
  type EventContext,
  type Result,
} from '@geo/domain';
import type { EventStore } from '@geo/storage';
import { z } from 'zod';
import { gzip } from './gzip.ts';
import { sha256Hex } from './sha256.ts';

export const EXPORT_FORMAT = 'geo-export';
export const EXPORT_FORMAT_VERSION = 1;

export const exportHeaderSchema = z.object({
  format: z.literal(EXPORT_FORMAT),
  formatVersion: z.number().int().positive(),
  exportedAt: z.number().int().nonnegative(),
  appVersion: z.string().min(1),
  eventCount: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
});

export type ExportHeader = z.infer<typeof exportHeaderSchema>;

export const exportedEventSchema = z.intersection(
  domainEventSchema,
  z.object({ context: eventContextSchema }),
);

export type ExportedEvent = z.infer<typeof exportedEventSchema>;

export interface ExportOptions {
  readonly appVersion: string;
  readonly exportedAt: number;
  readonly contexts: ReadonlyMap<ContextId, EventContext>;
}

export type ExportError = { readonly kind: 'missing-context'; readonly contextId: ContextId };

export function exportFilename(exportedAt: number): string {
  return `geography-progress-${new Date(exportedAt).toISOString().slice(0, 10)}.jsonl.gz`;
}

function toJsonLine(event: DomainEvent, context: EventContext): string {
  return JSON.stringify({ ...event, context });
}

// Gzipped JSON Lines: header first, then one event per line with its context
// inlined. Diagnostics are never included (FE01 behaviour 9).
export async function exportProgressJsonLines(
  store: EventStore,
  options: ExportOptions,
): Promise<Result<string, ExportError>> {
  const events: DomainEvent[] = [];
  for await (const event of store.readAll()) {
    events.push(event);
  }

  const lines: string[] = [];
  for (const event of events) {
    const context = options.contexts.get(event.contextId);
    if (context === undefined) {
      return { ok: false, error: { kind: 'missing-context', contextId: event.contextId } };
    }
    lines.push(toJsonLine(event, context));
  }

  const body = lines.join('\n');
  const header: ExportHeader = {
    format: EXPORT_FORMAT,
    formatVersion: EXPORT_FORMAT_VERSION,
    exportedAt: options.exportedAt,
    appVersion: options.appVersion,
    eventCount: events.length,
    sha256: sha256Hex(body),
  };

  return {
    ok: true,
    value: `${JSON.stringify(header)}\n${body}${body.length === 0 ? '' : '\n'}`,
  };
}

export async function exportProgress(
  store: EventStore,
  options: ExportOptions,
): Promise<Result<Uint8Array, ExportError>> {
  const lines = await exportProgressJsonLines(store, options);
  if (!lines.ok) {
    return lines;
  }
  return { ok: true, value: await gzip(new TextEncoder().encode(lines.value)) };
}
