import { describe, expect, it } from 'vitest';
import { packChunkPath, packManifestPath, StaticPackHost, type FetchInitLike } from './host.ts';
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

  it('refuses pack paths that could escape the static layout', () => {
    expect(() => packManifestPath('../secret')).toThrow(TypeError);
    expect(() => packChunkPath('not-a-hash')).toThrow(TypeError);
    expect(() => new StaticPackHost({ baseUrl: 'https://packs.example?x=1' })).toThrow(TypeError);
  });
});
