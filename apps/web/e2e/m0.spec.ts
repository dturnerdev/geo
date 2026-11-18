import { expect, test, type Request } from '@playwright/test';

const APP_ORIGIN = 'http://127.0.0.1:5173';

test.describe('M0 browser checks', () => {
  test('AC-01.10 second tab shows S19 and Use here moves the lock within 1 s without concurrent writes', async ({
    context,
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('#app')).toHaveAttribute('data-screen', 'S03');
    await expect(page.locator('#app')).toHaveAttribute('data-lock', 'active');

    await page.getByRole('button', { name: 'Start round' }).click();
    await expect(page.locator('#app')).toHaveAttribute('data-event-count', '1');

    const second = await context.newPage();
    await second.goto('/');
    await expect(second.locator('#app')).toHaveAttribute('data-screen', 'S19');
    await expect(second.locator('#app')).toHaveAttribute('data-lock', 'locked-elsewhere');

    // The first tab is still the holder while S19 is shown in the second tab.
    await expect(page.locator('#app')).toHaveAttribute('data-lock', 'active');
    await expect(page.locator('#app')).toHaveAttribute('data-event-count', '1');

    const requestedAt = Date.now();
    await second.getByRole('button', { name: 'Use here' }).click();

    // The lock changes hands within one second (FE01 AC-01.10).
    await expect(second.locator('#app')).toHaveAttribute('data-screen', 'S03', { timeout: 1_000 });
    expect(Date.now() - requestedAt).toBeLessThanOrEqual(1_000);

    // Only the new holder is active. The original tab has released and shows S19.
    await expect(second.locator('#app')).toHaveAttribute('data-lock', 'active');
    await expect(page.locator('#app')).toHaveAttribute('data-screen', 'S19');
    await expect(page.locator('#app')).toHaveAttribute('data-lock', 'locked-elsewhere');

    // A write is accepted only from the current holder and is visible after reload.
    await second.getByRole('button', { name: 'Start round' }).click();
    await expect(second.locator('#app')).toHaveAttribute('data-event-count', '2');

    await second.reload();
    await expect(second.locator('#app')).toHaveAttribute('data-screen', 'S03');
    await expect(second.locator('#app')).toHaveAttribute('data-event-count', '2');
    await expect(page.locator('#app')).toHaveAttribute('data-screen', 'S19');
  });

  test('AC-02.8 all requests stay on our host and carry no cookies or identifiers', async ({
    context,
    page,
  }) => {
    const requests: Request[] = [];
    const outsideOrigin: string[] = [];

    context.on('request', (request) => {
      requests.push(request);
      if (new URL(request.url()).origin !== APP_ORIGIN) {
        outsideOrigin.push(request.url());
      }
    });

    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== APP_ORIGIN) {
        await route.abort();
        return;
      }
      if (url.pathname.startsWith('/packs/')) {
        await route.fulfill({ status: 404, body: 'no update' });
        return;
      }
      await route.continue();
    });

    const manifestRequest = page.waitForRequest((request) =>
      request.url().includes('/packs/manifest-v1.json'),
    );
    await page.goto('/');
    await expect(page.locator('#app')).toHaveAttribute('data-screen', 'S03');
    const manifest = await manifestRequest;

    expect(outsideOrigin).toEqual([]);
    expect(requests.length).toBeGreaterThan(0);
    for (const request of requests) {
      expect(new URL(request.url()).origin).toBe(APP_ORIGIN);
    }

    for (const request of requests.filter((entry) => entry.url().includes('/packs/'))) {
      expect(new URL(request.url()).search).toBe('');
      const headers = await request.allHeaders();
      expect(headers).not.toHaveProperty('cookie');
      expect(headers).not.toHaveProperty('authorization');
      expect(Object.keys(headers).filter((name) => name.startsWith('x-'))).toEqual([]);
    }

    expect(await context.cookies()).toEqual([]);
    expect(new URL(manifest.url()).pathname).toBe('/packs/manifest-v1.json');
  });

  test('AC-01.2 killing after an accepted answer keeps every event', () => {
    test.skip(
      true,
      'The M0 web bootstrap has no answer-acceptance flow, so this cannot be exercised honestly here; Android and the M2 question flow own the remaining coverage.',
    );
  });

  test('AC-02.1 first launch with requests blocked still reaches the first question', () => {
    test.skip(
      true,
      'The M0 web bootstrap has no first-question screen yet; the bundled-pack offline unit coverage passes and the browser path is deferred to M2.',
    );
  });

  test('AC-02.3 a forced ready pack is not applied mid-round', () => {
    test.skip(
      true,
      'No signed update fixture can be produced without test-only signing keys or root config changes, which AGENTS forbids. Production pack verification is unchanged.',
    );
  });

  test('AC-05.5 pseudo-locale at 200% text has no clipped or overlapping text', () => {
    test.skip(
      true,
      'The M0 screens do not yet include the S01-S19 layout set or a pseudo-locale build; the manual Galaxy A07 4G pass is also outstanding.',
    );
  });
});
