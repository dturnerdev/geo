import { z } from 'zod';
import { canonicalJson } from './canonical-json.ts';
import { equalBytes, utf8Encode } from './bytes.ts';

// A pack is a signed manifest plus immutable, content-addressed chunks
// (FE02 behaviour 2–3). Zod validates every field at the network boundary
// (07 §7 rule 3).
export const PACK_FORMAT_VERSION = 1;

const sha256Schema = z.string().regex(/^[0-9a-f]{64}$/u, 'must be a lower-case SHA-256 hash');

export const packChunkDescriptorSchema = z
  .object({
    sha256: sha256Schema,
  })
  .strict();

export const packSignatureSchema = z
  .object({
    keyId: z.string().min(1),
    /** Base64 Ed25519 signature over canonicalJson(manifest without signature). */
    value: z.string().min(1),
  })
  .strict();

export const packManifestSchema = z
  .object({
    formatVersion: z.literal(PACK_FORMAT_VERSION),
    packVersion: z.string().min(1),
    dataFormat: z.string().min(1),
    createdAt: z.number().int().nonnegative(),
    chunks: z.array(packChunkDescriptorSchema).min(1),
    rollbackTo: z.string().min(1).optional(),
    signature: packSignatureSchema,
  })
  .strict();

export type PackChunkDescriptor = z.infer<typeof packChunkDescriptorSchema>;
export type PackManifest = z.infer<typeof packManifestSchema>;

const itemSchema = z.object({ id: z.string().min(1) }).passthrough();
const flagSchema = z.object({ id: z.string().min(1), default: z.unknown() }).passthrough();
const experimentSchema = z
  .object({ id: z.string().min(1), version: z.number().int().nonnegative() })
  .passthrough();

export const packPayloadSchema = z
  .object({
    items: z.array(itemSchema).default([]),
    flags: z.array(flagSchema).default([]),
    experiments: z.array(experimentSchema).default([]),
    tuning: z.record(z.string(), z.unknown()).default({}),
    daily: z
      .object({
        schedule: z.array(z.object({ date: z.string().min(1) }).passthrough()).default([]),
      })
      .strict()
      .default({ schedule: [] }),
  })
  .strict();

export type PackPayload = z.infer<typeof packPayloadSchema>;
export type PackItem = z.infer<typeof itemSchema>;
export type PackFlag = z.infer<typeof flagSchema>;
export type PackExperiment = z.infer<typeof experimentSchema>;

// Chunks may contain any subset of the payload. Merging is deterministic and
// independent of chunk order for arrays (FE02 behaviour 3).
export const packPartSchema = z
  .object({
    items: z.array(itemSchema).optional(),
    flags: z.array(flagSchema).optional(),
    experiments: z.array(experimentSchema).optional(),
    tuning: z.record(z.string(), z.unknown()).optional(),
    daily: z
      .object({
        schedule: z.array(z.object({ date: z.string().min(1) }).passthrough()).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type PackPart = z.infer<typeof packPartSchema>;

export function parsePackPart(input: unknown): PackPart {
  return packPartSchema.parse(input);
}

export function parsePackPayload(input: unknown): PackPayload {
  return packPayloadSchema.parse(input);
}

export interface MergedPackParts {
  readonly items: readonly unknown[];
  readonly flags: readonly unknown[];
  readonly experiments: readonly unknown[];
  readonly tuning: Readonly<Record<string, unknown>>;
  readonly daily: { readonly schedule: readonly unknown[] };
}

export function mergePackParts(parts: readonly PackPart[]): MergedPackParts {
  const items: unknown[] = [];
  const flags: unknown[] = [];
  const experiments: unknown[] = [];
  let tuning: Record<string, unknown> = {};
  const schedule: unknown[] = [];

  for (const part of parts) {
    items.push(...(part.items ?? []));
    flags.push(...(part.flags ?? []));
    experiments.push(...(part.experiments ?? []));
    tuning = { ...tuning, ...(part.tuning ?? {}) };
    schedule.push(...(part.daily?.schedule ?? []));
  }

  return { items, flags, experiments, tuning, daily: { schedule } };
}

export function manifestSigningMessage(manifest: PackManifest): Uint8Array {
  const body = {
    formatVersion: manifest.formatVersion,
    packVersion: manifest.packVersion,
    dataFormat: manifest.dataFormat,
    createdAt: manifest.createdAt,
    chunks: manifest.chunks,
    ...(manifest.rollbackTo === undefined ? {} : { rollbackTo: manifest.rollbackTo }),
  };
  return utf8Encode(canonicalJson(body));
}

export function packPayloadIsEqual(left: PackPayload, right: PackPayload): boolean {
  return equalBytes(utf8Encode(canonicalJson(left)), utf8Encode(canonicalJson(right)));
}

export function issuesFromZod(error: z.ZodError): readonly string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length === 0 ? '<root>' : issue.path.join('.');
    return `${path}: ${issue.message}`;
  });
}
