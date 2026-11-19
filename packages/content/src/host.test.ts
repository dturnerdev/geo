import { describe, expect, it } from 'vitest';
import { packChunkPath, packManifestPath, StaticPackHost, type FetchInitLike } from './host.ts';
import { packChunkDescriptorSchema } from './pack-schema.ts';
import { utf8Encode } from './bytes.ts';

const HASH = 'a'.repeat(64);

function recordingFetch() {
  const calls: { url: string; init: FetchInitLike }[] = [];
  const fetch = (url: string, init: FetchInitLike) => {
    calls.push({ url, init });
    return Promise.resolve({
      status: 200,
      headers: { get: (name: string) => (name === 'etag' ? '"etag"' : null) },
      arrayBuffer: () => Promise.resolve(utf8Encode('{}').buffer),
    });
  };
  return { calls, fetch };
}

describe('FE02 static pack host', () => {
  it('AC-02.8 all requests go only to our host with no cookies or identifiers', async () => {
    const recorder = recordingFetch();
    const host = new StaticPackHost({
      baseUrl: 'https://packs.example',
      fetch: recorder.fetch,
    });

    await host.fetchManifest('1', '"etag"');
    await host.fetchChunk(HASH);

    expect(recorder.calls).toHaveLength(2);
    for (const call of recorder.calls) {
      expect(call.url.startsWith('https://packs.example/packs/')).toBe(true);
      expect(call.url).not.toContain('?');
      expect(call.url).not.toContain('#');
      expect(call.init.credentials).toBe('omit');
      expect(call.init.redirect).toBe('error');
      expect(
        Object.keys(call.init.headers).every((key) => ['accept', 'if-none-match'].includes(key)),
      ).toBe(true);
      expect(JSON.stringify(call.init.headers).toLowerCase()).not.toContain('cookie');
    }
    expect(recorder.calls[0]?.url).toBe('https://packs.example/packs/manifest-v1.json');
    expect(recorder.calls[0]?.init.headers['if-none-match']).toBe('"etag"');
    expect(recorder.calls[1]?.url).toBe(`https://packs.example/packs/chunks/${HASH}`);
  });

  it.skip('AC-02.8 all requests go only to our host; no cookies or identifiers (browser network audit)', () => {
    // Skipped: needs the hosted Playwright network audit (CI gate 5), which is
    // not available in this worktree.
  });

  it('AC-09.6 detail chunks stay on our pack host and are content-addressed', async () => {
    const recorder = recordingFetch();
    const host = new StaticPackHost({
      baseUrl: 'https://packs.example',
      fetch: recorder.fetch,
    });
    const levelHashes = ['0'.repeat(64), '1'.repeat(64), '2'.repeat(64)];

    await Promise.all(levelHashes.map((hash) => host.fetchChunk(hash)));

    expect(recorder.calls.map((call) => call.url)).toEqual(
      levelHashes.map((hash) => `https://packs.example/packs/chunks/${hash}`),
    );
    expect(
      recorder.calls.every((call) => new URL(call.url).origin === 'https://packs.example'),
    ).toBe(true);
    expect(
      packChunkDescriptorSchema.safeParse({ sha256: 'https://example.test/chunk' }).success,
    ).toBe(false);
  });

  it('refuses pack paths that could escape the static layout', () => {
    expect(() => packManifestPath('../secret')).toThrow(TypeError);
    expect(() => packChunkPath('not-a-hash')).toThrow(TypeError);
    expect(() => new StaticPackHost({ baseUrl: 'https://packs.example?x=1' })).toThrow(TypeError);
  });
});
