// The diagnostics log is deliberately narrow: codes, numbers and coarse
// timings only. It has no free-text field, so a typed answer, place choice or
// free-text response cannot be recorded even by mistake (FE04 item 7).
export type DiagnosticKind =
  'error' | 'storage-failure' | 'pack-rollback' | 'performance' | 'clock';

export interface DiagnosticEntry {
  readonly at: number;
  readonly kind: DiagnosticKind;
  readonly code: string;
  readonly value?: number;
  readonly count?: number;
  readonly durationMs?: number;
  readonly monotonicAt?: number;
}

export interface DiagnosticsLog {
  record(entry: DiagnosticEntry): void;
  recent(limit: number): readonly DiagnosticEntry[];
  clear(): void;
}

export interface DiagnosticParseSuccess {
  readonly success: true;
  readonly data: DiagnosticEntry;
}

export interface DiagnosticParseFailure {
  readonly success: false;
  readonly error: { readonly message: string };
}

export type DiagnosticParseResult = DiagnosticParseSuccess | DiagnosticParseFailure;

const KINDS: ReadonlySet<string> = new Set<DiagnosticKind>([
  'error',
  'storage-failure',
  'pack-rollback',
  'performance',
  'clock',
]);

const ALLOWED_KEYS: ReadonlySet<string> = new Set([
  'at',
  'kind',
  'code',
  'value',
  'count',
  'durationMs',
  'monotonicAt',
]);

const CODE_PATTERN = /^[a-z][a-z0-9_.-]{0,63}$/;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return isNonNegativeNumber(value) && Number.isInteger(value);
}

function validate(input: unknown): DiagnosticParseResult {
  if (!isRecord(input)) {
    return { success: false, error: { message: 'diagnostic entry must be an object' } };
  }
  for (const key of Object.keys(input)) {
    if (!ALLOWED_KEYS.has(key)) {
      return {
        success: false,
        error: { message: `diagnostic entry has a non-allowlisted field "${key}"` },
      };
    }
  }
  if (!isNonNegativeInteger(input['at'])) {
    return { success: false, error: { message: 'at must be a non-negative integer' } };
  }
  if (typeof input['kind'] !== 'string' || !KINDS.has(input['kind'])) {
    return { success: false, error: { message: 'kind is not allowlisted' } };
  }
  if (typeof input['code'] !== 'string' || !CODE_PATTERN.test(input['code'])) {
    return { success: false, error: { message: 'code must be a machine code, not free text' } };
  }
  if (input['value'] !== undefined && !isNonNegativeNumber(input['value'])) {
    return { success: false, error: { message: 'value must be a non-negative number' } };
  }
  if (input['count'] !== undefined && !isNonNegativeInteger(input['count'])) {
    return { success: false, error: { message: 'count must be a non-negative integer' } };
  }
  if (input['durationMs'] !== undefined && !isNonNegativeNumber(input['durationMs'])) {
    return { success: false, error: { message: 'durationMs must be a non-negative number' } };
  }
  if (input['monotonicAt'] !== undefined && !isNonNegativeInteger(input['monotonicAt'])) {
    return { success: false, error: { message: 'monotonicAt must be a non-negative integer' } };
  }

  return {
    success: true,
    data: {
      at: input['at'],
      kind: input['kind'] as DiagnosticKind,
      code: input['code'],
      ...(input['value'] === undefined ? {} : { value: input['value'] }),
      ...(input['count'] === undefined ? {} : { count: input['count'] }),
      ...(input['durationMs'] === undefined ? {} : { durationMs: input['durationMs'] }),
      ...(input['monotonicAt'] === undefined ? {} : { monotonicAt: input['monotonicAt'] }),
    },
  };
}

export const diagnosticEntrySchema = {
  safeParse: validate,
  parse(input: unknown): DiagnosticEntry {
    const result = validate(input);
    if (!result.success) {
      throw new TypeError(result.error.message);
    }
    return result.data;
  },
};

function byteLength(entry: DiagnosticEntry): number {
  // Codes are ASCII by schema; JSON length is therefore the UTF-8 byte count.
  return JSON.stringify(entry).length;
}

export interface DiagnosticRingOptions {
  // FE04 placeholders come from engine/tuning.ts at the composition boundary.
  readonly maxBytes: number;
  readonly maxAgeMs: number;
  readonly now?: () => number;
  readonly initialEntries?: readonly DiagnosticEntry[];
}

// Ring buffer capped by size or age, whichever comes first (FE04 item 7).
export class DiagnosticRing implements DiagnosticsLog {
  private entries: DiagnosticEntry[];
  private bytes: number;
  private readonly maxBytes: number;
  private readonly maxAgeMs: number;
  private readonly now: () => number;

  constructor(options: DiagnosticRingOptions) {
    this.maxBytes = options.maxBytes;
    this.maxAgeMs = options.maxAgeMs;
    this.now = options.now ?? (() => Date.now());
    this.entries = [];
    this.bytes = 0;
    for (const entry of options.initialEntries ?? []) {
      this.record(entry);
    }
  }

  record(entry: DiagnosticEntry): void {
    const parsed = diagnosticEntrySchema.parse(entry);
    this.entries.push(parsed);
    this.bytes += byteLength(parsed);
    this.prune(this.now());
  }

  recent(limit: number): readonly DiagnosticEntry[] {
    this.prune(this.now());
    if (limit <= 0) {
      return [];
    }
    return this.entries.slice(-Math.floor(limit)).reverse();
  }

  clear(): void {
    this.entries = [];
    this.bytes = 0;
  }

  sizeBytes(): number {
    return this.bytes;
  }

  private prune(now: number): void {
    const oldest = now - this.maxAgeMs;
    while (this.entries.length > 0) {
      const first = this.entries[0];
      if (first === undefined || first.at >= oldest) {
        break;
      }
      this.entries.shift();
      this.bytes -= byteLength(first);
    }
    while (this.bytes > this.maxBytes && this.entries.length > 0) {
      const first = this.entries.shift();
      if (first === undefined) {
        break;
      }
      this.bytes -= byteLength(first);
    }
  }
}

export function createDiagnosticsLog(options: DiagnosticRingOptions): DiagnosticsLog {
  return new DiagnosticRing(options);
}
