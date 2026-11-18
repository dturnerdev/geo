import path from 'node:path';
import ts from 'typescript';
import type { Issue } from './lib.ts';
import { isMain, readText, relative, report, walkFiles } from './lib.ts';

const SOURCE_ROOTS = ['packages/ui/src', 'packages/app-shell/src', 'apps/web/src'];

function isStringLike(node: ts.Node): boolean {
  return (
    ts.isStringLiteral(node) ||
    ts.isNoSubstitutionTemplateLiteral(node) ||
    (ts.isTemplateExpression(node) && node.templateSpans.length > 0)
  );
}

function position(sourceFile: ts.SourceFile, node: ts.Node): string {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return `${line + 1}:${character + 1}`;
}

function inspectFile(rootDir: string, file: string): Issue[] {
  const source = readText(file);
  if (source === null) {
    return [];
  }

  const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, kind);
  const issues: Issue[] = [];
  const rel = relative(rootDir, file);

  const visit = (node: ts.Node): void => {
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.PlusToken &&
      (isStringLike(node.left) || isStringLike(node.right))
    ) {
      issues.push({
        file: rel,
        message: `${position(sourceFile, node)} joins text with "+"; use a FormatJS ICU message (AC-05.8)`,
      });
    }

    if (ts.isJsxText(node) && !node.containsOnlyTriviaWhiteSpaces && node.text.trim().length > 0) {
      issues.push({
        file: rel,
        message: `${position(sourceFile, node)} contains literal JSX text; use a FormatJS key (07 §7 rule 8)`,
      });
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return issues;
}

export function checkStrings(rootDir: string): Issue[] {
  const files = SOURCE_ROOTS.flatMap((sourceRoot) =>
    walkFiles(path.join(rootDir, sourceRoot), (file) => /\.(?:ts|tsx)$/.test(file)),
  ).filter((file) => !/\.(?:test|spec)\.tsx?$/.test(file));

  return files.flatMap((file) => inspectFile(rootDir, file));
}

if (isMain(import.meta.url)) {
  report('Gate 2 string lint', checkStrings(process.cwd()));
}
