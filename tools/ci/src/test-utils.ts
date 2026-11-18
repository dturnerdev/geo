import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

export function makeTempRoot(): string {
  return mkdtempSync(path.join(tmpdir(), 'geo-ci-'));
}

export function removeTempRoot(directory: string): void {
  rmSync(directory, { recursive: true, force: true });
}

export function writeTempFile(rootDir: string, relativePath: string, content: string): string {
  const file = path.join(rootDir, relativePath);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content, 'utf8');
  return file;
}
