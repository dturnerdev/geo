import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../../', import.meta.url));

function read(relative: string): string {
  return readFileSync(`${root}${relative}`, 'utf8');
}

describe('Android storage configuration', () => {
  it('AC-01.11 excludes cloud backup and includes device-to-device transfer', () => {
    const manifest = read('apps/android/app/src/main/AndroidManifest.xml');
    const rules = read('apps/android/app/src/main/res/xml/data_extraction_rules.xml');
    const legacyRules = read('apps/android/app/src/main/res/xml/backup_rules.xml');

    expect(manifest).toContain('android:allowBackup="true"');
    expect(manifest).toContain('android:dataExtractionRules="@xml/data_extraction_rules"');
    expect(manifest).toContain('android:fullBackupContent="@xml/backup_rules"');

    const cloudBackup = /<cloud-backup>([\s\S]*?)<\/cloud-backup>/.exec(rules)?.[1] ?? '';
    const deviceTransfer = /<device-transfer>([\s\S]*?)<\/device-transfer>/.exec(rules)?.[1] ?? '';
    expect(cloudBackup).toContain('<exclude');
    expect(deviceTransfer).toContain('<include');
    expect(legacyRules).toContain('<exclude');
  });
});
