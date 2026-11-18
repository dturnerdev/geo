import { afterEach, describe, expect, it } from 'vitest';
import { checkSupplyChain } from './check-supply-chain.ts';
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

describe('checkSupplyChain', () => {
  it('reports unpinned, unallowlisted and unregistered dependencies', () => {
    const directory = root();
    writeTempFile(
      directory,
      'package.json',
      JSON.stringify({ name: 'test', private: true, devDependencies: { foo: '^1.0.0' } }),
    );
    writeTempFile(
      directory,
      'tools/ci/dependency-allowlist.json',
      JSON.stringify({ dependencies: [] }),
    );
    writeTempFile(directory, 'docs/legal/licence-register.md', '# Licences\n');

    const messages = checkSupplyChain(directory).map((issue) => issue.message);

    expect(messages.some((message) => message.includes('not pinned'))).toBe(true);
    expect(messages.some((message) => message.includes('allowlist'))).toBe(true);
    expect(messages.some((message) => message.includes('licence register'))).toBe(true);
  });

  it('accepts an exact pinned, allowlisted, registered dependency', () => {
    const directory = root();
    writeTempFile(
      directory,
      'package.json',
      JSON.stringify({ name: 'test', private: true, devDependencies: { foo: '1.2.3' } }),
    );
    writeTempFile(
      directory,
      'tools/ci/dependency-allowlist.json',
      JSON.stringify({ dependencies: ['foo'] }),
    );
    writeTempFile(directory, 'docs/legal/licence-register.md', '| `foo` | 1.2.3 | MIT | test |\n');

    expect(checkSupplyChain(directory)).toEqual([]);
  });

  it('rejects analytics SDKs', () => {
    const directory = root();
    writeTempFile(
      directory,
      'package.json',
      JSON.stringify({
        name: 'test',
        private: true,
        dependencies: { 'some-analytics-sdk': '1.0.0' },
      }),
    );
    writeTempFile(
      directory,
      'tools/ci/dependency-allowlist.json',
      JSON.stringify({ dependencies: [] }),
    );
    writeTempFile(directory, 'docs/legal/licence-register.md', '');

    expect(
      checkSupplyChain(directory).some((issue) => issue.message.includes('banned dependency')),
    ).toBe(true);
  });
});
