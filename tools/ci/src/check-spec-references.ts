import path from 'node:path';
import type { Issue } from './lib.ts';
import { isMain, readText, relative, report, walkFiles } from './lib.ts';

type IdKind = 'D' | 'FE' | 'AC' | 'PK' | 'RK' | 'E' | 'S' | 'H';

const CITED_PATTERNS: Readonly<Record<IdKind, RegExp>> = {
  D: /\bD\d+\b/g,
  FE: /\bFE\d{2}\b/g,
  AC: /\bAC-\d{2}\.\d+[a-z]?\b/g,
  PK: /\bPK\d{2}\b/g,
  RK: /\bRK\d{2}\b/g,
  E: /\bE\d{2}\b/g,
  S: /\bS\d{2}\b/g,
  H: /\bH\d{2}\b/g,
};

function matches(text: string, pattern: RegExp): Set<string> {
  return new Set([...text.matchAll(pattern)].map((match) => match[0]));
}

function captures(text: string, pattern: RegExp): Set<string> {
  return new Set(
    [...text.matchAll(pattern)].flatMap((match) => {
      const value = match[1];
      return value === undefined ? [] : [value];
    }),
  );
}

function definitions(specText: string): Readonly<Record<IdKind, Set<string>>> {
  return {
    D: captures(specText, /^\|\s*(D\d+)\s*\|/gm),
    FE: captures(specText, /^##\s+(FE\d{2})\b/gm),
    AC: captures(specText, /\*\*(AC-\d{2}\.\d+[a-z]?)\*\*/g),
    PK: captures(specText, /^\s*\|\s*(PK\d{2})\s*\|/gm),
    RK: captures(specText, /^\s*\|\s*(RK\d{2})\s*\|/gm),
    E: captures(specText, /^\s*\|\s*(E\d{2})\s*\|/gm),
    S: captures(specText, /^\s*\|\s*(S\d{2})\s*\|/gm),
    H: captures(specText, /^\s*\|\s*(H\d{2})\s*\|/gm),
  };
}

export interface SpecReferenceOptions {
  readonly specDirectory: string;
  readonly coverageFile: string;
  readonly sourceDirectories: readonly string[];
}

export function checkSpecReferences(
  rootDir: string,
  options?: Partial<SpecReferenceOptions>,
): Issue[] {
  const specDirectory = options?.specDirectory ?? path.join(rootDir, 'docs/spec');
  const coverageFile = options?.coverageFile ?? path.join(rootDir, 'docs/backlog/ac-coverage.md');
  const sourceDirectories =
    options?.sourceDirectories ??
    ['packages', 'apps', 'tools'].map((dir) => path.join(rootDir, dir));

  const issues: Issue[] = [];
  const specFiles = walkFiles(specDirectory, (file) => file.endsWith('.md'));
  const specText = specFiles.map((file) => readText(file) ?? '').join('\n');
  const defined = definitions(specText);

  for (const [kind, pattern] of Object.entries(CITED_PATTERNS) as [IdKind, RegExp][]) {
    for (const id of matches(specText, pattern)) {
      if (!defined[kind].has(id)) {
        issues.push({ file: 'docs/spec', message: `cited ${kind} id "${id}" is not defined` });
      }
    }
  }

  for (const file of specFiles) {
    const text = readText(file) ?? '';
    if (/\bAC-\d+\.x\b/i.test(text)) {
      issues.push({ file: relative(rootDir, file), message: 'AC id numbered "x" (gate 7)' });
    }
  }

  const testFiles = sourceDirectories.flatMap((directory) =>
    walkFiles(directory, (file) => /\.(?:test|spec)\.tsx?$/.test(file)),
  );
  const coverageText = readText(coverageFile) ?? '';
  const covered = new Set<string>([
    ...matches(coverageText, CITED_PATTERNS.AC),
    ...testFiles.flatMap((file) => [...matches(readText(file) ?? '', CITED_PATTERNS.AC)]),
  ]);

  for (const id of defined.AC) {
    if (!covered.has(id)) {
      issues.push({
        file: 'docs/backlog/ac-coverage.md',
        message: `${id} needs a test whose name starts with the id, or a checklist row`,
      });
    }
  }

  return issues;
}

if (isMain(import.meta.url)) {
  report('Gate 7 spec references', checkSpecReferences(process.cwd()));
}
