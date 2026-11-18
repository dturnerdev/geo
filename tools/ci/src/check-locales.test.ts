import { afterEach, describe, expect, it } from 'vitest';
import { checkLocales } from './check-locales.ts';
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

describe('checkLocales', () => {
  it('reports missing keys, unused keys and invalid ICU', () => {
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

  it('accepts matching valid locales with used keys', () => {
    const directory = root();
    const locale = JSON.stringify({ greeting: 'Hello {name}' });
    writeTempFile(directory, 'packages/ui/src/locales/en-GB.json', locale);
    writeTempFile(directory, 'packages/ui/src/locales/en-US.json', locale);
    writeTempFile(
      directory,
      'packages/ui/src/Screen.ts',
      "const key = 'greeting';\nexport { key };\n",
    );

    expect(checkLocales(directory)).toEqual([]);
  });
});
