import { afterEach, describe, expect, it } from 'vitest';
import { checkSizes } from './check-sizes.ts';
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

describe('checkSizes', () => {
  it('reports a missing web build', () => {
    const directory = root();
    expect(checkSizes(directory).some((issue) => issue.message.includes('missing'))).toBe(true);
  });

  it('rejects eval and a developer panel marker in the bundle', () => {
    const directory = root();
    writeTempFile(
      directory,
      'apps/web/dist/assets/app.js',
      'const panel = "__DEVELOPER_PANEL__"; eval("1");\n',
    );

    const messages = checkSizes(directory).map((issue) => issue.message);

    expect(messages.some((message) => message.includes('developer-panel'))).toBe(true);
    expect(messages.some((message) => message.includes('eval'))).toBe(true);
  });

  it('accepts a small clean bundle', () => {
    const directory = root();
    writeTempFile(directory, 'apps/web/dist/index.html', '<div id="app"></div>\n');
    writeTempFile(directory, 'apps/web/dist/assets/app.js', 'document.title = "";\n');

    expect(checkSizes(directory)).toEqual([]);
  });
});
