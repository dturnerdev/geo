import path from 'node:path';
import type { Issue } from './lib.ts';
import { isMain, readText, relative, report } from './lib.ts';

const ALLOWED_PERMISSIONS = new Set([
  'android.permission.INTERNET',
  'android.permission.VIBRATE',
  'android.permission.POST_NOTIFICATIONS',
]);

function attribute(openTag: string, name: string): string | null {
  const pattern = new RegExp(`${name}\\s*=\\s*"([^"]+)"`);
  return pattern.exec(openTag)?.[1] ?? null;
}

function gradleNumber(source: string, name: string): number | null {
  const value = new RegExp(`${name}\\s*=\\s*(\\d+)`).exec(source)?.[1];
  return value === undefined ? null : Number(value);
}

export function checkManifest(rootDir: string): Issue[] {
  const androidRoot = path.join(rootDir, 'apps/android');
  const manifestFile = path.join(androidRoot, 'app/src/main/AndroidManifest.xml');
  const manifest = readText(manifestFile);
  if (manifest === null) {
    return [
      { file: 'apps/android/app/src/main/AndroidManifest.xml', message: 'manifest is missing' },
    ];
  }

  const issues: Issue[] = [];
  const manifestRelative = relative(rootDir, manifestFile);

  const permissions = [...manifest.matchAll(/<uses-permission[^>]*android:name="([^"]+)"/g)].map(
    (match) => match[1],
  );
  for (const permission of permissions) {
    if (permission !== undefined && !ALLOWED_PERMISSIONS.has(permission)) {
      issues.push({
        file: manifestRelative,
        message: `permission "${permission}" is not allowed by D178`,
      });
    }
  }
  for (const permission of ALLOWED_PERMISSIONS) {
    if (!permissions.includes(permission)) {
      issues.push({
        file: manifestRelative,
        message: `required permission "${permission}" is missing (D178)`,
      });
    }
  }

  const applicationTag = /<application\b[^>]*>/.exec(manifest)?.[0] ?? '';
  if (attribute(applicationTag, 'android:allowBackup') !== 'true') {
    issues.push({
      file: manifestRelative,
      message: 'android:allowBackup must be true so device transfer works (AC-01.11)',
    });
  }
  if (attribute(applicationTag, 'android:dataExtractionRules') !== '@xml/data_extraction_rules') {
    issues.push({
      file: manifestRelative,
      message: 'android:dataExtractionRules must point at @xml/data_extraction_rules (AC-01.11)',
    });
  }
  if (attribute(applicationTag, 'android:fullBackupContent') !== '@xml/backup_rules') {
    issues.push({
      file: manifestRelative,
      message: 'android:fullBackupContent must point at @xml/backup_rules (AC-01.11)',
    });
  }

  const extractionRules = readText(
    path.join(androidRoot, 'app/src/main/res/xml/data_extraction_rules.xml'),
  );
  const cloudBackup = extractionRules?.match(/<cloud-backup>([\s\S]*?)<\/cloud-backup>/)?.[1] ?? '';
  const deviceTransfer =
    extractionRules?.match(/<device-transfer>([\s\S]*?)<\/device-transfer>/)?.[1] ?? '';
  if (!/<exclude\b/.test(cloudBackup)) {
    issues.push({
      file: 'apps/android/app/src/main/res/xml/data_extraction_rules.xml',
      message: 'cloud backup must be excluded (AC-01.11)',
    });
  }
  if (!/<include\b/.test(deviceTransfer)) {
    issues.push({
      file: 'apps/android/app/src/main/res/xml/data_extraction_rules.xml',
      message: 'device-to-device transfer must be included (AC-01.11)',
    });
  }

  const gradle = readText(path.join(androidRoot, 'variables.gradle')) ?? '';
  if (gradleNumber(gradle, 'minSdkVersion') !== 29) {
    issues.push({
      file: 'apps/android/variables.gradle',
      message: 'minSdkVersion must be 29 (D135)',
    });
  }
  if (gradleNumber(gradle, 'targetSdkVersion') !== 36) {
    issues.push({
      file: 'apps/android/variables.gradle',
      message: 'targetSdkVersion must be 36 (D135, AC-29.6)',
    });
  }
  if (gradleNumber(gradle, 'compileSdkVersion') !== 36) {
    issues.push({
      file: 'apps/android/variables.gradle',
      message: 'compileSdkVersion must be 36 (D135, AC-29.6)',
    });
  }

  return issues;
}

if (isMain(import.meta.url)) {
  report('Gate 11 Android manifest', checkManifest(process.cwd()));
}
