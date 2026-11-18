import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { checkLocales } from '../../../tools/ci/src/check-locales.ts';
import { checkStrings } from '../../../tools/ci/src/check-strings.ts';
import { readText, relative, walkFiles } from '../../../tools/ci/src/lib.ts';
import { makeTempRoot, removeTempRoot, writeTempFile } from '../../../tools/ci/src/test-utils.ts';

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

describe('FE05 CI gates', () => {
  it('AC-05.4 fails on a missing key, invalid ICU message or unused key', () => {
    const directory = root();
    writeTempFile(
      directory,
      'packages/ui/src/locales/en-GB.json',
      JSON.stringify({ greeting: 'Hello {name}', orphan: 'No one uses me' }),
    );
    writeTempFile(
      directory,
      'packages/ui/src/locales/en-US.json',
      JSON.stringify({ greeting: 'Hello {name' }),
    );
    writeTempFile(
      directory,
      'packages/ui/src/Screen.ts',
      "const key = 'greeting';\nexport { key };\n",
    );

    const messages = checkLocales(directory).map((issue) => issue.message);

    expect(messages.some((message) => message.includes('missing key "orphan"'))).toBe(true);
    expect(messages.some((message) => message.includes('unused key "orphan"'))).toBe(true);
    expect(messages.some((message) => message.includes('not valid ICU'))).toBe(true);
  });

  it('AC-05.4 accepts the repository locales', () => {
    expect(checkLocales(process.cwd())).toEqual([]);
  });

  it('AC-05.6 locale and time code makes no network request', () => {
    const rootDir = process.cwd();
    const files = [
      'packages/domain/src/locale.ts',
      'packages/app-shell/src/locale.ts',
      'packages/app-shell/src/locale-settings.ts',
      'packages/ui/src/format.ts',
      ...walkFiles(
        path.join(rootDir, 'packages/engine/src/time'),
        (file) => file.endsWith('.ts') && !file.endsWith('.test.ts'),
      ),
    ];
    const networkPatterns = [
      /\bfetch\s*\(/,
      /\bXMLHttpRequest\b/,
      /\bWebSocket\b/,
      /\bsendBeacon\b/,
      /\bnavigator\./,
      /https?:\/\//,
    ];

    for (const file of files) {
      const source = readText(file);
      expect(source, `missing source file ${file}`).not.toBeNull();
      if (source === null) {
        continue;
      }
      for (const pattern of networkPatterns) {
        expect(source, `${relative(rootDir, file)} matches ${pattern.source}`).not.toMatch(pattern);
      }
    }
  });

  it('AC-05.8 fails on strings joined with "+" or literal JSX text', () => {
    const directory = root();
    writeTempFile(
      directory,
      'packages/ui/src/Screen.tsx',
      "export function Screen({ name }: { name: string }) {\n  const label = 'Hello ' + name;\n  return <p>Hello</p>;\n}\n",
    );

    const messages = checkStrings(directory).map((issue) => issue.message);

    expect(messages.some((message) => message.includes('joins text'))).toBe(true);
    expect(messages.some((message) => message.includes('literal JSX text'))).toBe(true);
  });

  it('AC-05.8 accepts the repository sources', () => {
    expect(checkStrings(process.cwd())).toEqual([]);
  });

  it.skip('AC-05.5 pseudo-locale at 200% text shows no clipped or overlapping text', () => {
    // Skipped: M0 screens and a Playwright runner are not present in this
    // worktree, and the manual Galaxy A07 4G check needs physical hardware.
  });
});
