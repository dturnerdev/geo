import path from 'node:path';
import type { Issue } from './lib.ts';
import { isMain, readText, relative, report, walkFiles } from './lib.ts';

interface PackageBoundary {
  readonly repoImports: readonly string[];
  readonly code: string;
}

const BOUNDARIES: Readonly<Record<string, PackageBoundary>> = {
  domain: { repoImports: [], code: '07 §4' },
  engine: { repoImports: ['domain'], code: '07 §4' },
  storage: { repoImports: ['domain'], code: '07 §4' },
  content: { repoImports: ['domain'], code: '07 §4' },
  'app-shell': {
    repoImports: ['domain', 'engine', 'storage', 'content', 'audio'],
    code: '07 §4',
  },
  globe: { repoImports: ['domain', 'engine'], code: '07 §4' },
  audio: { repoImports: ['domain'], code: '07 §4' },
  ui: { repoImports: ['domain', 'engine', 'app-shell', 'globe', 'audio'], code: '07 §4' },
};

const SQLITE_PACKAGES = ['@sqlite.org/sqlite-wasm', '@capacitor-community/sqlite'];
const THREE_PACKAGES = ['three', 'troika-three-text'];
const FSRS_PACKAGES = ['ts-fsrs', '@open-spaced-repetition/binding-wasm32-wasip1'];

const IMPORT_PATTERN = /(?:from\s*|import\s*\(\s*|import\s+)['"]([^'"]+)['"]/g;

function importedSpecifiers(source: string): string[] {
  const specifiers: string[] = [];
  for (const match of source.matchAll(IMPORT_PATTERN)) {
    const specifier = match[1];
    if (specifier !== undefined) {
      specifiers.push(specifier);
    }
  }
  return specifiers;
}

function repoPackageOf(specifier: string): string | null {
  if (!specifier.startsWith('@geo/')) {
    return null;
  }
  const name = specifier.slice('@geo/'.length).split('/')[0];
  return name === undefined ? null : name;
}

function sourcePackage(file: string, rootDir: string): string | null {
  const rel = relative(rootDir, file);
  const match = /^packages\/([^/]+)\/src\//.exec(rel);
  return match?.[1] ?? null;
}

export function checkImportBoundaries(rootDir: string): Issue[] {
  const issues: Issue[] = [];
  const files = walkFiles(path.join(rootDir, 'packages'), (file) => file.endsWith('.ts'));

  for (const file of files) {
    const pkg = sourcePackage(file, rootDir);
    if (pkg === null) {
      continue;
    }
    const boundary = BOUNDARIES[pkg];
    if (boundary === undefined) {
      issues.push({ file: relative(rootDir, file), message: `unknown package "${pkg}"` });
      continue;
    }

    const source = readText(file);
    if (source === null) {
      continue;
    }
    const rel = relative(rootDir, file);
    const isEngineMemory = pkg === 'engine' && rel.includes('/src/memory/');
    const isEngineGeo = pkg === 'engine' && rel.includes('/src/geo/');

    for (const specifier of importedSpecifiers(source)) {
      const importedRepoPackage = repoPackageOf(specifier);
      if (importedRepoPackage !== null) {
        if (!(importedRepoPackage in BOUNDARIES)) {
          issues.push({ file: rel, message: `imports unknown package "${specifier}"` });
          continue;
        }
        if (!boundary.repoImports.includes(importedRepoPackage)) {
          issues.push({
            file: rel,
            message: `"${pkg}" may not import "${specifier}" (${boundary.code})`,
          });
        }
        if (
          pkg === 'globe' &&
          importedRepoPackage === 'engine' &&
          specifier !== '@geo/engine/geo'
        ) {
          issues.push({
            file: rel,
            message: 'globe may only import @geo/engine/geo, not the whole engine (07 §4)',
          });
        }
        continue;
      }

      if (pkg !== 'storage' && SQLITE_PACKAGES.some((name) => specifier.startsWith(name))) {
        issues.push({
          file: rel,
          message: `only storage may import SQLite ("${specifier}") (07 §4)`,
        });
      }
      if (pkg !== 'globe' && THREE_PACKAGES.some((name) => specifier.startsWith(name))) {
        issues.push({
          file: rel,
          message: `only globe may import Three.js ("${specifier}") (07 §4)`,
        });
      }
      if (!isEngineMemory && FSRS_PACKAGES.some((name) => specifier.startsWith(name))) {
        issues.push({
          file: rel,
          message: `only engine/memory may import the memory model ("${specifier}") (07 §4)`,
        });
      }
      if (pkg === 'engine') {
        if (specifier === 'd3-geo' && !isEngineGeo) {
          issues.push({ file: rel, message: 'only engine/geo may import d3-geo (07 §4)' });
        }
        if (specifier === 'react' || specifier === 'react-dom' || specifier.startsWith('three')) {
          issues.push({ file: rel, message: `engine must stay free of UI code ("${specifier}")` });
        }
      }
      if (pkg === 'app-shell' && (specifier === 'react' || specifier === 'react-dom')) {
        issues.push({ file: rel, message: `app-shell must not import React ("${specifier}")` });
      }
      if (pkg === 'globe' && (specifier === 'react' || specifier === 'react-dom')) {
        issues.push({ file: rel, message: `globe must not import React ("${specifier}")` });
      }
    }
  }

  return issues;
}

if (isMain(import.meta.url)) {
  report('Gate 2 import boundaries', checkImportBoundaries(process.cwd()));
}
