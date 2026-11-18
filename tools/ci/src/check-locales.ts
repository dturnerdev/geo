import path from 'node:path';
import { parse } from '@formatjs/icu-messageformat-parser';
import type { Issue } from './lib.ts';
import { isMain, isRecord, readJson, readText, relative, report, walkFiles } from './lib.ts';

export const LOCALES = ['en-GB', 'en-US'] as const;

function loadMessages(
  file: string,
  issues: Issue[],
  rootDir: string,
): Record<string, string> | null {
  const value = readJson(file);
  if (!isRecord(value)) {
    issues.push({ file: relative(rootDir, file), message: 'locale file is not a JSON object' });
    return null;
  }
  const messages: Record<string, string> = {};
  for (const [key, message] of Object.entries(value)) {
    if (typeof message !== 'string') {
      issues.push({
        file: relative(rootDir, file),
        message: `message "${key}" is not a string`,
      });
      continue;
    }
    messages[key] = message;
  }
  return messages;
}

export function checkLocales(rootDir: string): Issue[] {
  const localeDirectory = path.join(rootDir, 'packages/ui/src/locales');
  const issues: Issue[] = [];
  const messages: Record<string, Record<string, string>> = {};

  for (const locale of LOCALES) {
    const file = path.join(localeDirectory, `${locale}.json`);
    const loaded = loadMessages(file, issues, rootDir);
    if (loaded === null) {
      continue;
    }
    messages[locale] = loaded;

    for (const [key, message] of Object.entries(loaded)) {
      try {
        parse(message);
      } catch (error) {
        const detail = error instanceof Error ? error.message : 'invalid ICU syntax';
        issues.push({
          file: relative(rootDir, file),
          message: `message "${key}" is not valid ICU: ${detail}`,
        });
      }
    }
  }

  const source = [
    ...walkFiles(path.join(rootDir, 'packages/ui/src'), (file) => /\.(?:ts|tsx)$/.test(file)),
    ...walkFiles(path.join(rootDir, 'apps/web/src'), (file) => /\.(?:ts|tsx)$/.test(file)),
  ]
    .map((file) => readText(file) ?? '')
    .join('\n');

  const sourceLocale = messages['en-GB'];
  const otherLocale = messages['en-US'];
  if (sourceLocale !== undefined && otherLocale !== undefined) {
    const sourceKeys = new Set(Object.keys(sourceLocale));
    const otherKeys = new Set(Object.keys(otherLocale));

    for (const key of sourceKeys) {
      if (!otherKeys.has(key)) {
        issues.push({
          file: 'packages/ui/src/locales/en-US.json',
          message: `missing key "${key}"`,
        });
      }
      if (!source.includes(key)) {
        issues.push({
          file: 'packages/ui/src/locales/en-GB.json',
          message: `unused key "${key}" (AC-05.4)`,
        });
      }
    }
    for (const key of otherKeys) {
      if (!sourceKeys.has(key)) {
        issues.push({
          file: 'packages/ui/src/locales/en-GB.json',
          message: `missing key "${key}"`,
        });
      }
    }
  }

  return issues;
}

if (isMain(import.meta.url)) {
  report('Gate 2 locale keys', checkLocales(process.cwd()));
}
