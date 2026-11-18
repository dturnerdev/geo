import { afterEach, describe, expect, it } from 'vitest';
import { checkManifest } from './check-manifest.ts';
import { makeTempRoot, removeTempRoot, writeTempFile } from './test-utils.ts';

const roots: string[] = [];

function root(): string {
  const directory = makeTempRoot();
  roots.push(directory);
  return directory;
}

const VALID_MANIFEST = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <uses-permission android:name="android.permission.INTERNET" />
  <uses-permission android:name="android.permission.VIBRATE" />
  <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
  <application
    android:allowBackup="true"
    android:dataExtractionRules="@xml/data_extraction_rules"
    android:fullBackupContent="@xml/backup_rules" />
</manifest>
`;

const VALID_RULES = `<data-extraction-rules>
  <cloud-backup><exclude domain="root" path="." /></cloud-backup>
  <device-transfer><include domain="root" path="." /></device-transfer>
</data-extraction-rules>
`;

function writeAndroid(directory: string, manifest = VALID_MANIFEST): void {
  writeTempFile(directory, 'apps/android/app/src/main/AndroidManifest.xml', manifest);
  writeTempFile(
    directory,
    'apps/android/app/src/main/res/xml/data_extraction_rules.xml',
    VALID_RULES,
  );
  writeTempFile(
    directory,
    'apps/android/variables.gradle',
    'ext {\n  minSdkVersion = 29\n  compileSdkVersion = 36\n  targetSdkVersion = 36\n}\n',
  );
}

afterEach(() => {
  for (const directory of roots.splice(0)) {
    removeTempRoot(directory);
  }
});

describe('checkManifest', () => {
  it('accepts D178 permissions, SDK levels and backup rules', () => {
    const directory = root();
    writeAndroid(directory);

    expect(checkManifest(directory)).toEqual([]);
  });

  it('rejects an extra permission and the wrong SDK level', () => {
    const directory = root();
    writeAndroid(
      directory,
      VALID_MANIFEST.replace(
        '<uses-permission android:name="android.permission.VIBRATE" />',
        '<uses-permission android:name="android.permission.VIBRATE" />\n  <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />',
      ),
    );
    writeTempFile(
      directory,
      'apps/android/variables.gradle',
      'ext {\n  minSdkVersion = 28\n  compileSdkVersion = 36\n  targetSdkVersion = 35\n}\n',
    );

    const messages = checkManifest(directory).map((issue) => issue.message);

    expect(messages.some((message) => message.includes('ACCESS_FINE_LOCATION'))).toBe(true);
    expect(messages.some((message) => message.includes('minSdkVersion'))).toBe(true);
    expect(messages.some((message) => message.includes('targetSdkVersion'))).toBe(true);
  });

  it('rejects cloud backup being included', () => {
    const directory = root();
    writeAndroid(directory);
    writeTempFile(
      directory,
      'apps/android/app/src/main/res/xml/data_extraction_rules.xml',
      '<data-extraction-rules><cloud-backup><include domain="root" path="." /></cloud-backup><device-transfer><include domain="root" path="." /></device-transfer></data-extraction-rules>',
    );

    expect(checkManifest(directory).some((issue) => issue.message.includes('cloud backup'))).toBe(
      true,
    );
  });
});
