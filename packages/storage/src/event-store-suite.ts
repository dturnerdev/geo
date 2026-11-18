import { emptyProjection } from '@geo/domain';
import { describe, expect, it } from 'vitest';
import type { EventStore } from './types.ts';
import { answerEvent, makeEvent } from './test-helpers.ts';

export function runEventStoreSuite(
  name: string,
  createStore: () => EventStore | Promise<EventStore>,
): void {
  describe(`EventStore suite: ${name}`, () => {
    it('AC-01.1 appends, counts and reads back in (at, id) order', async () => {
      const store = await createStore();
      const later = answerEvent(2_000, 'country-de');
      const earlier = answerEvent(1_000, 'country-fr');

      const result = await store.append([later, earlier]);
      expect(result.ok).toBe(true);
      expect(await store.count()).toBe(2);

      const read: string[] = [];
      for await (const event of store.readAll()) {
        read.push(event.id);
      }
      expect(read).toEqual([earlier.id, later.id]);

      const present = await store.hasIds([earlier.id, later.id, later.id]);
      expect([...present]).toEqual([earlier.id, later.id]);
    });

    it('AC-01.1 appends a batch in one transaction or not at all', async () => {
      const store = await createStore();
      const valid = answerEvent(1_000);
      const invalid = {
        ...answerEvent(2_000),
        payload: { rating: 'bad' },
      } as unknown as ReturnType<typeof answerEvent>;

      const result = await store.append([valid, invalid]);
      expect(result.ok).toBe(false);
      expect(await store.count()).toBe(0);
    });

    it('AC-01.1 importBatch inserts only missing ids and reports skipped', async () => {
      const store = await createStore();
      const first = answerEvent(1_000, 'country-fr');
      const second = answerEvent(2_000, 'country-de');
      expect((await store.append([first])).ok).toBe(true);

      const report = await store.importBatch([first, second]);
      expect(report.ok).toBe(true);
      if (report.ok) {
        expect(report.value).toEqual({ added: 1, skipped: 1 });
      }
      expect(await store.count()).toBe(2);
    });

    it('AC-01.1 reads and writes snapshots', async () => {
      const store = await createStore();
      const event = answerEvent(1_000);
      await store.append([event]);
      const snapshot = {
        projectionVersion: 1,
        lastEventId: event.id,
        state: emptyProjection(),
      };
      await store.saveSnapshot(snapshot);
      expect(await store.loadSnapshot()).toEqual(snapshot);
    });

    it('AC-01.1 wipe removes events and the snapshot', async () => {
      const store = await createStore();
      const event = makeEvent('ItemMet', { itemId: 'country-fr' });
      await store.append([event]);
      await store.saveSnapshot({
        projectionVersion: 1,
        lastEventId: event.id,
        state: emptyProjection(),
      });

      await store.wipe();
      expect(await store.count()).toBe(0);
      expect(await store.loadSnapshot()).toBeNull();
    });
  });
}
