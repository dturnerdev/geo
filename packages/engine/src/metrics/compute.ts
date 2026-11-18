import {
  sortEvents,
  type AnswerRecordedPayload,
  type DomainEvent,
} from '../../../domain/src/index.ts';
import {
  ACTIVE_PRACTICE_CAP_MS,
  DURABLE_KNOWLEDGE_HORIZON_DAYS,
  DURABLE_KNOWLEDGE_RECALL,
  MIN_RATE_SAMPLE,
  SURPRISE_ACCURACY_MIN_AGE_DAYS,
  SURPRISE_ACCURACY_MIN_SAMPLE,
} from '../tuning.ts';
import {
  DAY_MS,
  localDayKey,
  parseAnswer,
  predictRecall,
  updateMemory,
  type FacetMemory,
  type ParsedAnswer,
} from './analysis.ts';
import { computeCalibration, type CalibrationSample } from './calibration.ts';
import {
  type ContentIndex,
  type ExperimentId,
  type ItemFacetKey,
  type MetricsReport,
  type VariantId,
} from './types.ts';

interface VariantPoint {
  readonly at: number;
  readonly variant: VariantId;
}

interface CoreMetrics {
  readonly durableKnowledge: number;
  readonly surpriseAccuracy: number | null;
  readonly efficiencyPerHour: number | null;
  readonly calibration: MetricsReport['calibration'];
  readonly transfer: number | null;
}

function answersOf(events: readonly DomainEvent[]): readonly DomainEvent[] {
  return events.filter((event) => event.type === 'AnswerRecorded');
}

function retiredKeys(content: ContentIndex): ReadonlySet<ItemFacetKey> {
  const retired = new Set<ItemFacetKey>();
  for (const itemId of content.retiredItemIds ?? []) {
    retired.add(itemId);
  }
  for (const key of content.retiredItemFacets ?? []) {
    retired.add(key);
  }
  return retired;
}

function isRetired(key: ItemFacetKey, itemId: string, retired: ReadonlySet<ItemFacetKey>): boolean {
  if (retired.has(key)) {
    return true;
  }
  return retired.has(itemId) && (key === itemId || key.startsWith(`${itemId}#`));
}

function itemIdOfAnswer(payload: AnswerRecordedPayload): string {
  return payload.itemId;
}

// All FE04 definitions are applied once, over an already sorted log. Variant
// reports reuse this core so the formulas can never drift apart.
function computeCore(
  events: readonly DomainEvent[],
  content: ContentIndex,
  now: number,
): CoreMetrics {
  const answerEvents = answersOf(events);
  const parsed = answerEvents.map((event) => {
    if (event.type !== 'AnswerRecorded') {
      throw new Error('unreachable');
    }
    return parseAnswer(event);
  });

  const retired = retiredKeys(content);
  const firstLearnedAt = new Map<ItemFacetKey, number>();
  const itemIdByKey = new Map<ItemFacetKey, string>();
  const memory = new Map<ItemFacetKey, FacetMemory>();
  const lastAnswerByKey = new Map<ItemFacetKey, ParsedAnswer>();
  const seenFormats = new Map<ItemFacetKey, Set<string>>();
  const calibrationSamples: CalibrationSample[] = [];
  let activeMs = 0;
  let surpriseChecks = 0;
  let surpriseCorrect = 0;
  let transferChecks = 0;
  let transferCorrect = 0;

  for (let index = 0; index < answerEvents.length; index += 1) {
    const answer = parsed[index];
    const event = answerEvents[index];
    if (answer === undefined || event === undefined || event.type !== 'AnswerRecorded') {
      continue;
    }

    const previousAt = firstLearnedAt.get(answer.key);
    if (previousAt === undefined || answer.at < previousAt) {
      firstLearnedAt.set(answer.key, answer.at);
    }
    itemIdByKey.set(answer.key, itemIdOfAnswer(event.payload));

    const previous = lastAnswerByKey.get(answer.key);
    const sameDay =
      previous !== undefined &&
      localDayKey(previous.at, previous.timeZone) === localDayKey(answer.at, answer.timeZone);

    if (!answer.shown && !sameDay) {
      calibrationSamples.push({
        predicted: predictRecall(memory.get(answer.key) ?? null, answer.at),
        actual: answer.correct ? 1 : 0,
      });
    }
    // Same-day answers still update memory (FSRS short-term), they are only
    // excluded from calibration (AC-04.2, FE13). "Show me" is never counted as
    // an incorrect review in a metric (AC-04.3).
    if (!answer.shown) {
      memory.set(answer.key, updateMemory(memory.get(answer.key) ?? null, answer));
    }
    lastAnswerByKey.set(answer.key, answer);
    activeMs += Math.min(answer.responseMs, ACTIVE_PRACTICE_CAP_MS);

    const learnedAt = firstLearnedAt.get(answer.key);
    const oldEnough =
      learnedAt !== undefined && now - learnedAt >= SURPRISE_ACCURACY_MIN_AGE_DAYS * DAY_MS;
    if (answer.surprise && oldEnough && !answer.shown) {
      surpriseChecks += 1;
      if (answer.correct) {
        surpriseCorrect += 1;
      }
    }

    const formats = seenFormats.get(answer.key) ?? new Set<string>();
    // The first format for a facet is its introduction, not transfer. Only a
    // later format that has never been used for that facet counts (FE04).
    if (!answer.shown && formats.size > 0 && !formats.has(answer.format)) {
      transferChecks += 1;
      if (answer.correct) {
        transferCorrect += 1;
      }
    }
    formats.add(answer.format);
    seenFormats.set(answer.key, formats);
  }

  const targetAt = now + DURABLE_KNOWLEDGE_HORIZON_DAYS * DAY_MS;
  let durableKnowledge = 0;
  for (const [key, state] of memory) {
    const itemId = itemIdByKey.get(key) ?? '';
    if (isRetired(key, itemId, retired)) {
      continue;
    }
    if (predictRecall(state, targetAt) >= DURABLE_KNOWLEDGE_RECALL) {
      durableKnowledge += 1;
    }
  }

  const activeHours = activeMs / (60 * 60 * 1000);
  const efficiencyPerHour =
    parsed.length < MIN_RATE_SAMPLE || activeHours <= 0 ? null : durableKnowledge / activeHours;

  return {
    durableKnowledge,
    surpriseAccuracy:
      surpriseChecks < SURPRISE_ACCURACY_MIN_SAMPLE ? null : surpriseCorrect / surpriseChecks,
    efficiencyPerHour,
    calibration: computeCalibration(calibrationSamples),
    transfer: transferChecks < MIN_RATE_SAMPLE ? null : transferCorrect / transferChecks,
  };
}

function variantTimeline(events: readonly DomainEvent[]): {
  readonly firstExposureAt: ReadonlyMap<ExperimentId, number>;
  readonly timeline: ReadonlyMap<ExperimentId, readonly VariantPoint[]>;
} {
  const firstExposureAt = new Map<ExperimentId, number>();
  const timeline = new Map<ExperimentId, VariantPoint[]>();

  for (const event of events) {
    if (event.type !== 'ExperimentAssigned' && event.type !== 'ExperimentExposed') {
      continue;
    }
    const experimentId = event.payload.experimentId;
    const points = timeline.get(experimentId) ?? [];
    points.push({ at: event.at, variant: event.payload.variant });
    timeline.set(experimentId, points);

    if (event.type === 'ExperimentExposed') {
      const first = firstExposureAt.get(experimentId);
      if (first === undefined || event.at < first) {
        firstExposureAt.set(experimentId, event.at);
      }
    }
  }

  return { firstExposureAt, timeline };
}

function variantAt(points: readonly VariantPoint[], at: number): VariantId | null {
  let variant: VariantId | null = null;
  for (const point of points) {
    if (point.at > at) {
      break;
    }
    variant = point.variant;
  }
  return variant;
}

function computeByVariant(
  events: readonly DomainEvent[],
  content: ContentIndex,
  now: number,
): ReadonlyMap<ExperimentId, ReadonlyMap<VariantId, MetricsReport>> {
  const { firstExposureAt, timeline } = variantTimeline(events);
  const byVariant = new Map<ExperimentId, ReadonlyMap<VariantId, MetricsReport>>();

  for (const [experimentId, firstAt] of firstExposureAt) {
    const points = timeline.get(experimentId) ?? [];
    const variantIds = [...new Set(points.map((point) => point.variant))];
    const variants = new Map<VariantId, MetricsReport>();
    for (const variantId of variantIds) {
      const slice = events.filter((event) => {
        if (event.at < firstAt) {
          return false;
        }
        if (event.type !== 'AnswerRecorded') {
          return false;
        }
        return variantAt(points, event.at) === variantId;
      });
      const core = computeCore(slice, content, now);
      variants.set(variantId, {
        ...core,
        byVariant: new Map(),
      });
    }
    byVariant.set(experimentId, variants);
  }

  return byVariant;
}

// Pure metric computation from the event log only (FE04 behaviour 1).
export function computeMetrics(
  events: Iterable<DomainEvent>,
  content: ContentIndex,
  now: number,
): MetricsReport {
  const sorted = sortEvents([...events]);
  const core = computeCore(sorted, content, now);
  return {
    ...core,
    byVariant: computeByVariant(sorted, content, now),
  };
}
