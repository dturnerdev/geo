import { err, ok, type Result } from '@geo/domain';
import { canonicalJson } from './canonical-json.ts';
import {
  geometryPackSchema,
  lngLatIssues,
  type FeatureSlotEntry,
  type FeatureSlotTable,
  type GeometryChunk,
  type GeometryPack,
  type TapZone,
} from './geometry.ts';

// 04 §6.1 fixes the M1 geometry invariants. Zod checks the shape of each
// record; this module checks the cross-record rules that make a pack usable.
export interface GeometryIssue {
  readonly path: readonly (string | number)[];
  readonly message: string;
}

export type GeometryValidationError = {
  readonly kind: 'invalid-geometry';
  readonly issues: readonly GeometryIssue[];
};

interface LocatedChunk {
  readonly path: readonly (string | number)[];
  readonly chunk: GeometryChunk;
}

function addIssue(
  issues: GeometryIssue[],
  path: readonly (string | number)[],
  message: string,
): void {
  issues.push({ path, message });
}

function validateSlotTable(table: FeatureSlotTable, issues: GeometryIssue[]): void {
  const slots = new Set<number>();
  const featureIds = new Set<string>();

  table.entries.forEach((entry, index) => {
    const path = ['featureSlotTable', 'entries', index] as const;
    if (slots.has(entry.slot)) {
      addIssue(issues, path, `duplicate feature slot ${String(entry.slot)}`);
    }
    if (featureIds.has(entry.featureId)) {
      addIssue(issues, path, `duplicate feature identity "${entry.featureId}"`);
    }
    slots.add(entry.slot);
    featureIds.add(entry.featureId);
  });

  const sorted = [...slots].sort((left, right) => left - right);
  for (let expected = 0; expected < sorted.length; expected += 1) {
    if (sorted[expected] !== expected) {
      addIssue(
        issues,
        ['featureSlotTable', 'entries'],
        `feature slots must be a dense zero-based namespace; missing slot ${String(expected)}`,
      );
      break;
    }
  }
}

function validateGeometryChunk(
  chunk: GeometryChunk,
  path: readonly (string | number)[],
  tableBySlot: ReadonlyMap<number, FeatureSlotEntry>,
  issues: GeometryIssue[],
  isRegionGeometry = false,
): void {
  if (!isRegionGeometry) {
    if (chunk.level === 'L2') {
      addIssue(issues, [...path, 'level'], 'L2 geometry must be a RegionChunk record');
    }
    if (chunk.region !== null) {
      addIssue(issues, [...path, 'region'], 'L0 and L1 chunks must not have a region');
    }
  }

  const chunkFeatures = new Map<number, FeatureSlotEntry>();
  chunk.features.forEach((entry, index) => {
    const entryPath = [...path, 'features', index];
    if (chunkFeatures.has(entry.slot)) {
      addIssue(issues, entryPath, `duplicate feature slot ${String(entry.slot)} in chunk`);
    }
    chunkFeatures.set(entry.slot, entry);

    const tableEntry = tableBySlot.get(entry.slot);
    if (tableEntry === undefined) {
      addIssue(issues, entryPath, `slot ${String(entry.slot)} is not in the pack slot table`);
      return;
    }
    if (tableEntry.featureId !== entry.featureId) {
      addIssue(
        issues,
        entryPath,
        `slot ${String(entry.slot)} has feature "${entry.featureId}" but the table says "${tableEntry.featureId}"`,
      );
    }
    if (tableEntry.item !== entry.item) {
      addIssue(
        issues,
        [...entryPath, 'item'],
        `slot ${String(entry.slot)} has a different item from the pack slot table`,
      );
    }
  });

  const { spherePositions, flatPositions, indices, featureSlots } = chunk.mesh;
  if (spherePositions.length % 3 !== 0) {
    addIssue(
      issues,
      [...path, 'mesh', 'spherePositions'],
      'spherePositions must be packed XYZ triples',
    );
  }
  if (flatPositions.length % 3 !== 0) {
    addIssue(
      issues,
      [...path, 'mesh', 'flatPositions'],
      'flatPositions must be packed XYZ triples',
    );
  }
  if (spherePositions.length !== flatPositions.length) {
    addIssue(
      issues,
      [...path, 'mesh', 'flatPositions'],
      'sphere and flat positions must have equal vertex counts',
    );
  }
  const vertexCount = Math.min(spherePositions.length, flatPositions.length) / 3;
  if (featureSlots.length !== vertexCount) {
    addIssue(
      issues,
      [...path, 'mesh', 'featureSlots'],
      'featureSlots must have one entry per vertex',
    );
  }
  if (indices.length % 3 !== 0) {
    addIssue(issues, [...path, 'mesh', 'indices'], 'indices must be triangle triples');
  }
  indices.forEach((index, position) => {
    if (!Number.isInteger(index) || index < 0 || index >= vertexCount) {
      addIssue(
        issues,
        [...path, 'mesh', 'indices', position],
        `index ${String(index)} is not a vertex in this mesh`,
      );
    }
  });

  const referencedSlots = new Set<number>();
  featureSlots.forEach((slot, vertex) => {
    referencedSlots.add(slot);
    if (!chunkFeatures.has(slot)) {
      addIssue(
        issues,
        [...path, 'mesh', 'featureSlots', vertex],
        `mesh vertex references slot ${String(slot)} which is not in the chunk features`,
      );
    }
  });
  chunk.features.forEach((entry, index) => {
    if (!referencedSlots.has(entry.slot)) {
      addIssue(
        issues,
        [...path, 'features', index],
        `slot ${String(entry.slot)} has no vertices in this chunk`,
      );
    }
  });

  chunk.outlines.forEach((line, lineIndex) => {
    line.points.forEach((point, pointIndex) => {
      for (const message of lngLatIssues(point.lng, point.lat)) {
        addIssue(issues, [...path, 'outlines', lineIndex, 'points', pointIndex], message);
      }
    });
  });

  chunk.tapZones.forEach((zone, zoneIndex) => {
    validateTapZone(zone, [...path, 'tapZones', zoneIndex], issues);
  });

  chunk.labelAnchors.forEach((anchor, anchorIndex) => {
    for (const message of lngLatIssues(anchor.at.lng, anchor.at.lat)) {
      addIssue(issues, [...path, 'labelAnchors', anchorIndex, 'at'], message);
    }
  });
}

function validateTapZone(
  zone: TapZone,
  path: readonly (string | number)[],
  issues: GeometryIssue[],
): void {
  if (zone.rings.length === 0) {
    addIssue(issues, [...path, 'rings'], 'a tap zone needs at least one ring');
  }
  zone.rings.forEach((ring, ringIndex) => {
    if (ring.length < 3) {
      addIssue(issues, [...path, 'rings', ringIndex], 'a tap-zone ring needs at least 3 points');
    }
    ring.forEach((point, pointIndex) => {
      for (const message of lngLatIssues(point.lng, point.lat)) {
        addIssue(issues, [...path, 'rings', ringIndex, pointIndex], message);
      }
    });
  });
}

function validateRegionChunk(
  region: GeometryPack['regionChunks'][number],
  path: readonly (string | number)[],
  tableBySlot: ReadonlyMap<number, FeatureSlotEntry>,
  issues: GeometryIssue[],
): void {
  if (region.level !== 'L2') {
    addIssue(issues, [...path, 'level'], 'region records must be L2');
  }
  if (region.geometry.level !== 'L2') {
    addIssue(issues, [...path, 'geometry', 'level'], 'region geometry must be L2');
  }
  if (region.geometry.region !== region.id) {
    addIssue(
      issues,
      [...path, 'geometry', 'region'],
      `region geometry must carry its own id "${region.id}"`,
    );
  }
  validateGeometryChunk(region.geometry, [...path, 'geometry'], tableBySlot, issues, true);
}

function tapZoneKey(zone: TapZone): string {
  const points = zone.rings.flat();
  if (points.some((point) => lngLatIssues(point.lng, point.lat).length > 0)) {
    // Invalid coordinates are already issues; avoid canonical JSON throwing on
    // a non-finite number while still comparing the zone deterministically.
    return JSON.stringify(zone.rings);
  }
  return canonicalJson(zone.rings);
}

export function validateGeometryPack(pack: GeometryPack): readonly GeometryIssue[] {
  const issues: GeometryIssue[] = [];
  validateSlotTable(pack.featureSlotTable, issues);

  const tableBySlot = new Map(
    pack.featureSlotTable.entries.map((entry) => [entry.slot, entry] as const),
  );

  const chunks: LocatedChunk[] = [];
  const levels = new Set<string>();
  pack.chunks.forEach((chunk, index) => {
    const path = ['chunks', index] as const;
    if (levels.has(chunk.level)) {
      addIssue(issues, [...path, 'level'], `duplicate ${chunk.level} chunk`);
    }
    levels.add(chunk.level);
    validateGeometryChunk(chunk, path, tableBySlot, issues);
    chunks.push({ path: [...path, 'tapZones'], chunk });
  });

  const regionIds = new Set<string>();
  pack.regionChunks.forEach((region, index) => {
    const path = ['regionChunks', index] as const;
    if (regionIds.has(region.id)) {
      addIssue(issues, [...path, 'id'], `duplicate region chunk id "${region.id}"`);
    }
    regionIds.add(region.id);
    validateRegionChunk(region, path, tableBySlot, issues);
    chunks.push({ path: [...path, 'geometry', 'tapZones'], chunk: region.geometry });
  });

  // Tap zones are the grading boundary and must be identical at every detail
  // level (FE09 behaviour 5, AC-09.5).
  const zonesByItem = new Map<
    string,
    { readonly key: string; readonly path: readonly (string | number)[] }
  >();
  for (const located of chunks) {
    for (const [index, zone] of located.chunk.tapZones.entries()) {
      const key = tapZoneKey(zone);
      const existing = zonesByItem.get(zone.item);
      if (existing === undefined) {
        zonesByItem.set(zone.item, { key, path: [...located.path, index] });
      } else if (existing.key !== key) {
        addIssue(
          issues,
          [...located.path, index],
          `tap zone for "${zone.item}" differs from the one at ${existing.path.join('.')}`,
        );
      }
    }
  }

  return issues;
}

function issueFromZod(path: readonly (string | number)[], message: string): GeometryIssue {
  return { path, message };
}

export function parseGeometryPack(input: unknown): Result<GeometryPack, GeometryValidationError> {
  const parsed = geometryPackSchema.safeParse(input);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) =>
      issueFromZod(
        issue.path.filter((part): part is string | number => typeof part !== 'symbol'),
        issue.message,
      ),
    );
    return err({ kind: 'invalid-geometry', issues });
  }
  const issues = validateGeometryPack(parsed.data);
  if (issues.length > 0) {
    return err({ kind: 'invalid-geometry', issues });
  }
  return ok(parsed.data);
}

export function geometryIssuesAsStrings(issues: readonly GeometryIssue[]): readonly string[] {
  return issues.map(
    (issue) => `${issue.path.length === 0 ? '<root>' : issue.path.join('.')}: ${issue.message}`,
  );
}
