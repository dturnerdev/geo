import { afterEach, describe, expect, it } from 'vitest';
import { checkStrings } from './check-strings.ts';
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

describe('checkStrings', () => {
  it('rejects text joined with + and literal JSX text', () => {
    const directory = root();
    writeTempFile(
      directory,
      'packages/ui/src/Screen.tsx',
      "export function Screen({ name }: { name: string }) {\n  const label = 'Hello ' + name;\n  return <p>Hello</p>;\n}\n",
    );

    const issues = checkStrings(directory);

    expect(issues).toHaveLength(2);
    expect(issues.map((issue) => issue.message).join(' ')).toContain('FormatJS');
  });

  it('accepts a message key passed through unchanged', () => {
    const directory = root();
    writeTempFile(
      directory,
      'packages/ui/src/Screen.tsx',
      "export function Screen() {\n  return <p>{'greeting'}</p>;\n}\n",
    );

    expect(checkStrings(directory)).toEqual([]);
  });
});
