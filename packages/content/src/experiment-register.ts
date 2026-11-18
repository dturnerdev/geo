import type { ExperimentDefinition, ExperimentId } from '@geo/domain';

// The pre-registration template in 08 §8. The result is filled in at the end,
// so it is deliberately not required here (FE03 behaviour 8, AC-03.6).
export const EXPERIMENT_REGISTER_FIELDS = [
  'Question',
  'Variants',
  'Owner feature, flag key',
  'Builds',
  'Primary metric',
  'Guardrails and margins (default 08 §7)',
  'Harness can model it',
  'Start, end, minimum length',
  'Decision rule',
  'Nudging or DPIA impact',
  'Simulation report',
] as const;

export const EXPERIMENT_REGISTER_RESULT_FIELD = 'Result, decision, D entry';

export interface ExperimentRegisterDocument {
  readonly experimentId: ExperimentId;
  readonly path: string;
  readonly text: string;
}

export interface ExperimentRegisterIssue {
  readonly experimentId: ExperimentId;
  readonly field: string;
  readonly message: string;
}

function normaliseField(line: string): { readonly key: string; readonly value: string } | null {
  const match = /^\s*-\s*([^:]+):\s*(.*)$/u.exec(line);
  if (match === null) {
    return null;
  }
  const key = match[1];
  const value = match[2];
  if (key === undefined || value === undefined) {
    return null;
  }
  return { key: key.trim(), value: value.trim() };
}

export function checkExperimentRegistrations(
  experiments: readonly ExperimentDefinition[],
  documents: readonly ExperimentRegisterDocument[],
): readonly ExperimentRegisterIssue[] {
  const issues: ExperimentRegisterIssue[] = [];
  const byPath = new Map(documents.map((document) => [document.path, document]));
  const byId = new Map(documents.map((document) => [document.experimentId, document]));

  for (const experiment of experiments) {
    const expectedPath = `experiments/${experiment.id}.md`;
    const document = byPath.get(expectedPath) ?? byId.get(experiment.id);
    if (document === undefined) {
      issues.push({
        experimentId: experiment.id,
        field: '<document>',
        message: `missing ${expectedPath}`,
      });
      continue;
    }

    if (experiment.register !== expectedPath) {
      issues.push({
        experimentId: experiment.id,
        field: 'register',
        message: `register must be ${expectedPath}`,
      });
    }

    const title = document.text.split(/\r?\n/u).find((line) => /^\s*#\s+/u.test(line));
    if (title === undefined || !title.includes(experiment.id)) {
      issues.push({
        experimentId: experiment.id,
        field: '<title>',
        message: `title must name ${experiment.id}`,
      });
    }

    const fields = new Map<string, string>();
    for (const line of document.text.split(/\r?\n/u)) {
      const field = normaliseField(line);
      if (field !== null && !fields.has(field.key)) {
        fields.set(field.key, field.value);
      }
    }

    for (const required of EXPERIMENT_REGISTER_FIELDS) {
      const value = fields.get(required);
      if (value === undefined) {
        issues.push({
          experimentId: experiment.id,
          field: required,
          message: `missing "${required}"`,
        });
        continue;
      }
      if (value.length === 0 || value === '(at the end)') {
        issues.push({
          experimentId: experiment.id,
          field: required,
          message: `"${required}" is not filled in`,
        });
        continue;
      }
      if (required === 'Variants') {
        for (const variant of experiment.variants) {
          if (!value.includes(variant.id)) {
            issues.push({
              experimentId: experiment.id,
              field: required,
              message: `variant "${variant.id}" is not listed`,
            });
          }
        }
      }
    }
  }

  return issues;
}
