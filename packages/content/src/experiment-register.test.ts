import { flagExperimentDefinitionsSchema } from '@geo/domain';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  checkExperimentRegistrations,
  type ExperimentRegisterDocument,
} from './experiment-register.ts';

const root = process.cwd();
const definitions = flagExperimentDefinitionsSchema.parse(
  JSON.parse(readFileSync(path.join(root, 'content/experiments/definitions.json'), 'utf8')),
);

function registerDocuments(): readonly ExperimentRegisterDocument[] {
  return readdirSync(path.join(root, 'experiments'))
    .filter((file) => /^E\d{2}\.md$/u.test(file))
    .map((file) => ({
      experimentId: file.slice(0, 3),
      path: `experiments/${file}`,
      text: readFileSync(path.join(root, 'experiments', file), 'utf8'),
    }));
}

describe('FE03 experiment definitions and register', () => {
  it('AC-03.6 CI fails for an experiment without a complete experiments/Exx.md', () => {
    expect(checkExperimentRegistrations(definitions.experiments, registerDocuments())).toEqual([]);

    const documents = registerDocuments();
    const first = documents[0];
    if (first === undefined) {
      throw new Error('register fixture missing');
    }
    const broken = documents.map((document) =>
      document.experimentId === first.experimentId
        ? { ...document, text: document.text.replace(/^- Question:.*$/mu, '') }
        : document,
    );
    const issues = checkExperimentRegistrations(definitions.experiments, broken);
    expect(issues.some((issue) => issue.field === 'Question')).toBe(true);

    const missing = checkExperimentRegistrations(
      [
        ...definitions.experiments,
        {
          id: 'E99',
          version: 1,
          register: 'experiments/E99.md',
          variants: [{ id: 'A', weight: 10_000 }],
        },
      ],
      broken,
    );
    expect(missing.some((issue) => issue.experimentId === 'E99')).toBe(true);
  });

  it('accepts the authored content definitions and rejects invalid weights or links', () => {
    expect(definitions.flags.length).toBeGreaterThan(0);
    expect(definitions.experiments.length).toBeGreaterThan(0);

    expect(() =>
      flagExperimentDefinitionsSchema.parse({
        flags: [],
        experiments: [
          {
            id: 'E10',
            version: 1,
            register: 'experiments/E10.md',
            variants: [{ id: 'A', weight: 5000 }],
          },
        ],
      }),
    ).toThrow(/sum to 10000/u);

    expect(() =>
      flagExperimentDefinitionsSchema.parse({
        flags: [],
        experiments: [
          {
            id: 'E10',
            version: 1,
            flag: 'missingFlag',
            register: 'experiments/E11.md',
            variants: [{ id: 'A', weight: 10_000 }],
          },
        ],
      }),
    ).toThrow();

    expect(() =>
      flagExperimentDefinitionsSchema.parse({
        flags: [],
        experiments: [
          {
            id: 'E10',
            version: 1,
            register: 'experiments/E10.md',
            variants: [
              { id: 'B', weight: 5000 },
              { id: 'C', weight: 5000 },
            ],
          },
        ],
      }),
    ).toThrow(/variant A is required/u);
  });
});
