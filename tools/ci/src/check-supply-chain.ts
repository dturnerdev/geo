import path from 'node:path';
import type { Issue } from './lib.ts';
import { isMain, isRecord, readJson, readText, relative, report, walkFiles } from './lib.ts';

const EXACT_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const INTERNAL_VERSION = /^workspace:/;
const BANNED_DEPENDENCY =
  /(?:analytics|amplitude|bugsnag|crashlytics|datadog|firebase|google-analytics|mixpanel|newrelic|sentry|segment)/i;

interface Manifest {
  readonly file: string;
  readonly name: string;
  readonly dependencies: readonly { readonly name: string; readonly version: string }[];
}

function packageManifests(rootDir: string): Manifest[] {
  const files = [
    path.join(rootDir, 'package.json'),
    ...walkFiles(path.join(rootDir, 'apps'), (file) => file.endsWith('package.json')),
    ...walkFiles(path.join(rootDir, 'packages'), (file) => file.endsWith('package.json')),
    ...walkFiles(path.join(rootDir, 'tools'), (file) => file.endsWith('package.json')),
  ];

  const manifests: Manifest[] = [];
  for (const file of files) {
    const value = readJson(file);
    if (!isRecord(value) || typeof value['name'] !== 'string') {
      continue;
    }
    const dependencies: { name: string; version: string }[] = [];
    for (const field of [
      'dependencies',
      'devDependencies',
      'optionalDependencies',
      'peerDependencies',
    ]) {
      const block = value[field];
      if (!isRecord(block)) {
        continue;
      }
      for (const [name, version] of Object.entries(block)) {
        if (typeof version === 'string') {
          dependencies.push({ name, version });
        }
      }
    }
    manifests.push({ file: relative(rootDir, file), name: value['name'], dependencies });
  }
  return manifests;
}

function allowlist(rootDir: string): Set<string> {
  const value = readJson(path.join(rootDir, 'tools/ci/dependency-allowlist.json'));
  if (!isRecord(value) || !Array.isArray(value['dependencies'])) {
    return new Set();
  }
  return new Set(value['dependencies'].filter((item): item is string => typeof item === 'string'));
}

export function checkSupplyChain(rootDir: string): Issue[] {
  const issues: Issue[] = [];
  const allowed = allowlist(rootDir);
  const licenceRegister = readText(path.join(rootDir, 'docs/legal/licence-register.md')) ?? '';

  for (const manifest of packageManifests(rootDir)) {
    for (const dependency of manifest.dependencies) {
      if (BANNED_DEPENDENCY.test(dependency.name)) {
        issues.push({
          file: manifest.file,
          message: `banned dependency "${dependency.name}" (D107)`,
        });
        continue;
      }

      const internal = dependency.name.startsWith('@geo/');
      if (
        (!internal && !EXACT_VERSION.test(dependency.version)) ||
        (internal && !INTERNAL_VERSION.test(dependency.version))
      ) {
        issues.push({
          file: manifest.file,
          message: `"${dependency.name}" is not pinned exactly ("${dependency.version}")`,
        });
      }

      if (!internal) {
        if (!allowed.has(dependency.name)) {
          issues.push({
            file: manifest.file,
            message: `"${dependency.name}" is not on the dependency allowlist (D107, AC-29.3)`,
          });
        }
        if (!licenceRegister.includes(dependency.name)) {
          issues.push({
            file: 'docs/legal/licence-register.md',
            message: `"${dependency.name}" has no licence register entry`,
          });
        }
      }
    }
  }

  const audioFiles = walkFiles(path.join(rootDir, 'content/audio'), (file) =>
    /\.(?:m4a|mp3|wav|ogg)$/i.test(file),
  );
  for (const file of audioFiles) {
    const sidecar = readJson(`${file}.licence.json`);
    if (!isRecord(sidecar) || sidecar['commercial'] !== true) {
      issues.push({
        file: relative(rootDir, file),
        message: 'release audio needs a ".licence.json" sidecar with "commercial": true (D87, D89)',
      });
    }
  }

  return issues;
}

if (isMain(import.meta.url)) {
  report('Gate 9 supply chain', checkSupplyChain(process.cwd()));
}
