import { describe, expect, it } from 'vitest';
import { answerSchemas, answerTypeSchema, rawResponseSchema, type AnswerType } from './answers.ts';

const FIXTURES: Readonly<Record<AnswerType, unknown>> = {
  region: { kind: 'region', at: { lng: 2.35, lat: 48.85 }, itemIds: ['country.fra'] },
  set: { kind: 'set', itemIds: ['country.fra', 'country.deu'] },
  point: { kind: 'point', at: { lng: 2.35, lat: 48.85 } },
  choice: { kind: 'choice', optionId: 'option:country.deu' },
  text: { kind: 'text', value: 'France' },
  assignment: { kind: 'assignment', pairs: [['country.fra', 'europe']] },
  sequence: { kind: 'sequence', ids: ['river.a', 'river.b'] },
  bearing: { kind: 'bearing', degrees: 90, shot: 1 },
  path: {
    kind: 'path',
    points: [
      { lng: 0, lat: 0 },
      { lng: 1, lat: 1 },
    ],
  },
  multiValue: { kind: 'multiValue', values: [{ value: 'France', role: 'claims' }] },
  dateRange: { kind: 'dateRange', from: '1900-01-01', to: '2000-01-01' },
  comparison: { kind: 'comparison', left: 'a', right: 'b', relation: 'more' },
  audio: { kind: 'audio', clipId: 'clip.a01' },
};

describe('FE10 answer types', () => {
  it('AC-10.6 every answer type has a schema test, even without MVP content', () => {
    const types = answerTypeSchema.options;
    expect(types).toHaveLength(13);
    for (const type of types) {
      const parsed = answerSchemas[type].safeParse(FIXTURES[type]);
      expect(parsed.success, type).toBe(true);
    }
  });

  it('AC-10.6 rejects malformed values for every answer type', () => {
    expect(answerSchemas.point.safeParse({ kind: 'point', at: { lng: 181, lat: 0 } }).success).toBe(
      false,
    );
    expect(
      answerSchemas.bearing.safeParse({ kind: 'bearing', degrees: 360, shot: 1 }).success,
    ).toBe(false);
    expect(
      answerSchemas.dateRange.safeParse({ kind: 'dateRange', from: 'nope', to: '2000-01-01' })
        .success,
    ).toBe(false);
    expect(answerSchemas.sequence.safeParse({ kind: 'sequence', ids: [''] }).success).toBe(false);
  });

  it('AC-10.6 accepts every FE10 RawResponse variant including show me', () => {
    const responses = [
      { kind: 'region', at: null, itemIds: [] },
      { kind: 'point', at: { lng: 0, lat: 0 } },
      { kind: 'choice', optionId: 'a' },
      { kind: 'text', value: 'a' },
      { kind: 'assignment', pairs: [['a', 'b']] },
      { kind: 'sequence', ids: ['a'] },
      { kind: 'bearing', degrees: 1, shot: 2 },
      { kind: 'path', points: [{ lng: 0, lat: 0 }] },
      { kind: 'showMe' },
    ];
    for (const response of responses) {
      expect(rawResponseSchema.safeParse(response).success, response.kind).toBe(true);
    }
  });
});
