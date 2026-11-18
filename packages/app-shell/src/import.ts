import {
  upgradeDomainEvent,
  type DomainEvent,
  type ImportCompletedPayload,
  type Result,
} from '@geo/domain';
import type { EventStore, ImportReport, StoreError } from '@geo/storage';
import { z } from 'zod';
import {
  EXPORT_FORMAT,
  EXPORT_FORMAT_VERSION,
  exportHeaderSchema,
  type ExportHeader,
} from './export.ts';
import { gunzip } from './gzip.ts';
import { sha256Hex } from './sha256.ts';

export const NEWER_FORMAT_MESSAGE =
  'This file is from a newer version of the app. Update the app, then try again.';

export interface ImportPreview {
  readonly answers: number;
  readonly firstAt: number | null;
  readonly lastAt: number | null;
  readonly newEvents: number;
}

export interface ParsedImport {
  readonly header: ExportHeader;
  readonly events: readonly DomainEvent[];
  readonly preview: ImportPreview;
}

export type ImportFileError =
  | { readonly kind: 'corrupt'; readonly detail: string }
  | { readonly kind: 'checksum' }
  | { readonly kind: 'newer-format'; readonly message: string }
  | { readonly kind: 'unsupported-format' }
  | { readonly kind: 'store'; readonly error: StoreError };

export interface ImportOutcome {
  readonly report: ImportReport;
  readonly completedEvent: DomainEvent | null;
}

export interface ApplyImportOptions {
  readonly makeImportCompleted: (payload: ImportCompletedPayload) => DomainEvent;
}

const looseLineSchema = z.record(z.string(), z.unknown());

async function decode(bytes: Uint8Array): Promise<string> {
  const gzipped = bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
  const decoded = gzipped ? await gunzip(bytes) : bytes;
  return new TextDecoder().decode(decoded);
}

// Validate the whole file before touching the store: header, checksum, every
// line with Zod, and the format version (FE01 behaviour 10.1, D164).
export async function parseImportFile(
  store: EventStore,
  bytes: Uint8Array,
): Promise<Result<ParsedImport, ImportFileError>> {
  let text: string;
  try {
    text = await decode(bytes);
  } catch {
    return { ok: false, error: { kind: 'corrupt', detail: 'the file is not valid gzip data' } };
  }

  const allLines = text.split('\n');
  if (allLines.at(-1) === '') {
    allLines.pop();
  }
  const headerLine = allLines.shift();
  if (headerLine === undefined) {
    return { ok: false, error: { kind: 'corrupt', detail: 'the header is missing' } };
  }

  let headerValue: unknown;
  try {
    headerValue = JSON.parse(headerLine);
  } catch {
    return { ok: false, error: { kind: 'corrupt', detail: 'the header is not JSON' } };
  }

  const header = exportHeaderSchema.safeParse(headerValue);
  if (!header.success) {
    return { ok: false, error: { kind: 'corrupt', detail: 'the header is not an export header' } };
  }
  if (header.data.format !== EXPORT_FORMAT) {
    return { ok: false, error: { kind: 'corrupt', detail: 'the file format is not geo-export' } };
  }
  if (header.data.formatVersion > EXPORT_FORMAT_VERSION) {
    return { ok: false, error: { kind: 'newer-format', message: NEWER_FORMAT_MESSAGE } };
  }
  if (header.data.formatVersion !== EXPORT_FORMAT_VERSION) {
    return { ok: false, error: { kind: 'unsupported-format' } };
  }

  const body = allLines.join('\n');
  if (sha256Hex(body) !== header.data.sha256) {
    return { ok: false, error: { kind: 'checksum' } };
  }
  if (header.data.eventCount !== allLines.length) {
    return { ok: false, error: { kind: 'corrupt', detail: 'the event count does not match' } };
  }

  const events: DomainEvent[] = [];
  for (const line of allLines) {
    let parsedLine: unknown;
    try {
      parsedLine = JSON.parse(line);
    } catch {
      return { ok: false, error: { kind: 'corrupt', detail: 'an event line is not JSON' } };
    }

    const record = looseLineSchema.safeParse(parsedLine);
    if (!record.success || !('context' in record.data)) {
      return { ok: false, error: { kind: 'corrupt', detail: 'an event has no inline context' } };
    }

    const { context, ...eventValue } = record.data;
    const upgraded = upgradeDomainEvent(eventValue);
    if (!upgraded.ok) {
      return { ok: false, error: { kind: 'corrupt', detail: 'an event payload is invalid' } };
    }

    const contextCheck = z
      .object({
        id: z.number().int().nonnegative(),
        appVersion: z.string().min(1),
        contentPackVersion: z.string().min(1),
        graderVersions: z.record(z.string(), z.string()),
        platform: z.string().min(1),
      })
      .safeParse(context);
    if (!contextCheck.success || contextCheck.data.id !== upgraded.value.contextId) {
      return { ok: false, error: { kind: 'corrupt', detail: 'an inline context is invalid' } };
    }

    events.push(upgraded.value);
  }

  const present = await store.hasIds(events.map((event) => event.id));
  const answers = events.filter((event) => event.type === 'AnswerRecorded').length;
  const times = events.map((event) => event.at);
  const preview: ImportPreview = {
    answers,
    firstAt: times.length === 0 ? null : Math.min(...times),
    lastAt: times.length === 0 ? null : Math.max(...times),
    newEvents: events.length - present.size,
  };

  return { ok: true, value: { header: header.data, events, preview } };
}

// Insert the new ids in one transaction, rebuild state from the merged log,
// then append ImportCompleted (FE01 behaviour 10.3-10.4).
export async function applyImport(
  store: EventStore,
  parsed: ParsedImport,
  options: ApplyImportOptions,
): Promise<Result<ImportOutcome, ImportFileError>> {
  const imported = await store.importBatch(parsed.events);
  if (!imported.ok) {
    return { ok: false, error: { kind: 'store', error: imported.error } };
  }

  let completedEvent: DomainEvent | null = null;
  // A second import of the same file adds nothing and must leave the log
  // unchanged (AC-01.6).
  if (imported.value.added > 0) {
    completedEvent = options.makeImportCompleted({
      added: imported.value.added,
      skipped: imported.value.skipped,
      sourceExportedAt: parsed.header.exportedAt,
    });
    const appended = await store.append([completedEvent]);
    if (!appended.ok) {
      return { ok: false, error: { kind: 'store', error: appended.error } };
    }
  }

  return { ok: true, value: { report: imported.value, completedEvent } };
}
