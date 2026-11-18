import { z } from 'zod';

// IDs are branded strings so a context id can never be passed where an event id
// belongs. UUIDv7 gives lexicographic time ordering for the (at, id) sort (FE01).
export type EventId = string & { readonly __brand: 'EventId' };
export type InstallId = string & { readonly __brand: 'InstallId' };
export type OriginId = string & { readonly __brand: 'OriginId' };
export type ContextId = number & { readonly __brand: 'ContextId' };
export type ItemId = string;
export type RoundId = string;

// RFC 9562 UUID version 7, lower-case canonical form.
const UUID_V7_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export const eventIdSchema = z
  .string()
  .regex(UUID_V7_PATTERN, 'must be a UUIDv7')
  .transform((value): EventId => value as EventId);

export const installIdSchema = z
  .string()
  .regex(UUID_V7_PATTERN, 'must be a UUIDv7')
  .transform((value): InstallId => value as InstallId);

export const originIdSchema = z
  .string()
  .regex(UUID_V7_PATTERN, 'must be a UUIDv7')
  .transform((value): OriginId => value as OriginId);

export const contextIdSchema = z
  .number()
  .int()
  .nonnegative()
  .transform((value): ContextId => value as ContextId);

export const itemIdSchema = z.string().min(1);

export const roundIdSchema = z.string().min(1);
