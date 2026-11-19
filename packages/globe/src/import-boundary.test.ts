import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const THREE_IMPORT =
  /(?:from\s*|import\s*\(\s*|import\s+)['"](?:three|troika-three-text)(?:\/[^'"]*)?['"]/;

function sourceFiles(directory: string): readonly string[] {
  const entries: string[] = [];
  for (const name of readdirSync(directory)) {
    const full = path.join(directory, name);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      if (name !== 'node_modules') {
        entries.push(...sourceFiles(full));
      }
    } else if (name.endsWith('.ts')) {
      entries.push(full);
    }
  }
  return entries;
}

describe('FE06 package boundaries', () => {
  it('AC-06.7 no package other than globe imports Three.js', () => {
    const packagesRoot = path.join(process.cwd(), 'packages');
    const offenders: string[] = [];

    for (const pkg of readdirSync(packagesRoot)) {
      if (pkg === 'globe') {
        continue;
      }
      const sourceRoot = path.join(packagesRoot, pkg, 'src');
      let files: readonly string[] = [];
      try {
        files = sourceFiles(sourceRoot);
      } catch {
        continue;
      }
      for (const file of files) {
        if (THREE_IMPORT.test(readFileSync(file, 'utf8'))) {
          offenders.push(path.relative(process.cwd(), file));
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
