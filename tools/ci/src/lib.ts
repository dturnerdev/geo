import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export interface Issue {
  file: string;
  message: string;
}

export function toPosix(value: string): string {
  return value.split(path.sep).join('/');
}

export function walkFiles(directory: string, accept: (file: string) => boolean): string[] {
  let entries;
  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch {
    return [];
  }

  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'coverage') {
        continue;
      }
      files.push(...walkFiles(full, accept));
    } else if (entry.isFile() && accept(full)) {
      files.push(full);
    }
  }
  return files.sort();
}

export function readText(file: string): string | null {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

export function readJson(file: string): unknown {
  const text = readText(file);
  if (text === null) {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export function relative(rootDir: string, file: string): string {
  return toPosix(path.relative(rootDir, file));
}

export function isMain(moduleUrl: string): boolean {
  const entry = process.argv[1];
  return entry !== undefined && pathToFileURL(path.resolve(entry)).href === moduleUrl;
}

export function report(gate: string, issues: readonly Issue[]): void {
  if (issues.length === 0) {
    console.log(`${gate}: ok`);
    return;
  }
  console.error(`${gate}: ${issues.length} problem(s)`);
  for (const issue of issues) {
    console.error(`  ${issue.file}: ${issue.message}`);
  }
  process.exitCode = 1;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function directoryExists(directory: string): boolean {
  try {
    return statSync(directory).isDirectory();
  } catch {
    return false;
  }
}
