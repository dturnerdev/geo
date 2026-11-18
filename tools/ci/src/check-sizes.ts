import path from 'node:path';
import { statSync } from 'node:fs';
import type { Issue } from './lib.ts';
import { isMain, readText, relative, report, walkFiles } from './lib.ts';

export const WEB_FIRST_LOAD_BUDGET_BYTES = 3 * 1024 * 1024;
export const ANDROID_PACKAGE_BUDGET_BYTES = 40 * 1024 * 1024;

export function checkSizes(rootDir: string): Issue[] {
  const issues: Issue[] = [];
  const webDist = path.join(rootDir, 'apps/web/dist');

  const webFiles = walkFiles(webDist, (file) => !file.endsWith('.map'));
  if (webFiles.length === 0) {
    issues.push({ file: 'apps/web/dist', message: 'web build output is missing; run pnpm build' });
  }

  let total = 0;
  for (const file of webFiles) {
    const text = readText(file);
    if (text === null) {
      continue;
    }
    total += Buffer.byteLength(text);
    if (file.endsWith('.js')) {
      if (text.includes('__DEVELOPER_PANEL__')) {
        issues.push({
          file: relative(rootDir, file),
          message: 'developer-panel marker is present in a public bundle (AC-03.3)',
        });
      }
      if (/\beval\s*\(/.test(text) || /\bnew\s+Function\s*\(/.test(text)) {
        issues.push({
          file: relative(rootDir, file),
          message: 'bundle contains eval or dynamic code loading (D107)',
        });
      }
    }
  }

  if (total > WEB_FIRST_LOAD_BUDGET_BYTES) {
    issues.push({
      file: 'apps/web/dist',
      message: `web first load is ${total} bytes, over the 3 MB budget (D106, D131)`,
    });
  }

  const androidPackages = walkFiles(
    path.join(rootDir, 'apps/android'),
    (file) => file.endsWith('.apk') || file.endsWith('.aab'),
  );
  for (const file of androidPackages) {
    const size = statSync(file).size;
    if (size > ANDROID_PACKAGE_BUDGET_BYTES) {
      issues.push({
        file: relative(rootDir, file),
        message: `Android package is ${size} bytes, over the 40 MB budget (AC-09.2)`,
      });
    }
  }

  return issues;
}

if (isMain(import.meta.url)) {
  report('Gate 8 size budgets', checkSizes(process.cwd()));
}
