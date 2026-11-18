import { afterEach, describe, expect, it } from 'vitest';
import { checkImportBoundaries } from './check-boundaries.ts';
import { makeTempRoot, removeTempRoot, writeTempFile } from './test-utils.ts';

const roots: string[] = [];

function root(): string {
  const directory = makeTempRoot();
  roots.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of roots.splice(0)) {
    removeTempRoot(directory);
  }
});

describe('checkImportBoundaries', () => {
  it('rejects ui importing storage directly', () => {
    const directory = root();
    writeTempFile(directory, 'packages/ui/src/index.ts', "import '@geo/storage';\n");

    const issues = checkImportBoundaries(directory);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain('may not import');
  });

  it('allows the documented app-shell imports', () => {
    const directory = root();
    writeTempFile(
      directory,
      'packages/app-shell/src/index.ts',
      "import '@geo/domain';\nimport '@geo/engine';\nimport '@geo/storage';\nimport '@geo/content';\nimport '@geo/audio';\n",
    );

    expect(checkImportBoundaries(directory)).toEqual([]);
  });

  it('only lets engine/geo import d3-geo and only engine/memory import ts-fsrs', () => {
    const directory = root();
    writeTempFile(
      directory,
      'packages/engine/src/index.ts',
      "import 'd3-geo';\nimport 'ts-fsrs';\n",
    );
    writeTempFile(directory, 'packages/engine/src/geo/index.ts', "import 'd3-geo';\n");
    writeTempFile(directory, 'packages/engine/src/memory/index.ts', "import 'ts-fsrs';\n");

    const issues = checkImportBoundaries(directory);

    expect(issues).toHaveLength(2);
    expect(issues.map((issue) => issue.message).join(' ')).toContain('d3-geo');
    expect(issues.map((issue) => issue.message).join(' ')).toContain('memory model');
  });
});
