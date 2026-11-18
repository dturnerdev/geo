import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { checkSpecReferences } from './check-spec-references.ts';
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

describe('checkSpecReferences', () => {
  it('reports undefined citations and uncovered ACs', () => {
    const directory = root();
    writeTempFile(
      directory,
      'docs/spec/01-test.md',
      '| D1 | decision |\n\n## FE01 Feature\n\n- **AC-01.1** covered.\n- **AC-01.2** not covered.\n\nSee D999.\n',
    );
    writeTempFile(directory, 'docs/backlog/ac-coverage.md', '| AC-01.1 | Planned |\n');

    const messages = checkSpecReferences(directory, {
      specDirectory: path.join(directory, 'docs/spec'),
      coverageFile: path.join(directory, 'docs/backlog/ac-coverage.md'),
      sourceDirectories: [path.join(directory, 'packages')],
    }).map((issue) => issue.message);

    expect(messages.some((message) => message.includes('D999'))).toBe(true);
    expect(messages.some((message) => message.includes('AC-01.2'))).toBe(true);
  });

  it('accepts defined and covered ids', () => {
    const directory = root();
    writeTempFile(
      directory,
      'docs/spec/01-test.md',
      '| D1 | decision |\n\n## FE01 Feature\n\n- **AC-01.1** covered.\n\nSee D1.\n',
    );
    writeTempFile(directory, 'docs/backlog/ac-coverage.md', '| AC-01.1 | Planned |\n');

    expect(
      checkSpecReferences(directory, {
        specDirectory: path.join(directory, 'docs/spec'),
        coverageFile: path.join(directory, 'docs/backlog/ac-coverage.md'),
        sourceDirectories: [path.join(directory, 'packages')],
      }),
    ).toEqual([]);
  });
});
