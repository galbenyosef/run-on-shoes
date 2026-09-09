import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import ts from 'typescript';

const root = fileURLToPath(new URL('../..', import.meta.url));
const packageRoot = resolve(root, 'run_on_shoes');
function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory()
      ? files(path)
      : /\.tsx?$/.test(entry.name)
        ? [path]
        : [];
  });
}
function parse(path: string) {
  return ts.createSourceFile(
    path,
    readFileSync(path, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
}
function imports(source: ts.SourceFile) {
  const found: string[] = [];
  function visit(node: ts.Node) {
    if (
      ts.isImportDeclaration(node) &&
      node.importClause?.phaseModifier !== ts.SyntaxKind.TypeKeyword &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const clause = node.importClause;
      const bindings = clause?.namedBindings;
      if (
        clause &&
        !clause.name &&
        bindings &&
        ts.isNamedImports(bindings) &&
        bindings.elements.every((e) => e.isTypeOnly)
      )
        return;
      found.push(node.moduleSpecifier.text);
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      found.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return found;
}

void test('Entry is a single no-argument Demo call and all Module capabilities are static', () => {
  const entry = parse(resolve(root, 'run_on_shoes.ts'));
  const calls = entry.statements.filter(ts.isExpressionStatement);
  assert.equal(calls.length, 1);
  assert.ok(ts.isCallExpression(calls[0].expression));
  assert.equal(calls[0].expression.arguments.length, 0);
  assert.deepEqual(imports(entry), ['./run_on_shoes/Demo/bootstrap.tsx']);
  for (const path of files(resolve(packageRoot, 'Module'))) {
    for (const statement of parse(path).statements) {
      if (!ts.isClassDeclaration(statement)) continue;
      for (const member of statement.members) {
        assert.ok(
          ts.isMethodDeclaration(member),
          'Module classes contain capability methods only',
        );
        assert.ok(
          member.modifiers?.some((m) => m.kind === ts.SyntaxKind.StaticKeyword),
        );
      }
    }
  }
});

void test('Runtime dependencies obey layers and have no cycles', () => {
  const graph = new Map<string, string[]>();
  const allowed: Record<string, Set<string>> = {
    Demo: new Set(['Demo', 'API']),
    API: new Set(['API', 'Module', 'Config']),
    Module: new Set(['Module', 'Method', 'Dataset', 'Config']),
    Method: new Set(['Method', 'Dataset', 'Config']),
    Dataset: new Set(['Dataset', 'Method', 'Config']),
    Config: new Set(['Config']),
    Types: new Set(),
  };
  for (const path of files(packageRoot)) {
    const layer = relative(packageRoot, path).split('/')[0];
    if (layer === 'Test') continue;
    const dependencies: string[] = [];
    for (const specifier of imports(parse(path))) {
      if (!specifier.startsWith('.')) continue;
      const imported = resolve(dirname(path), specifier);
      if (!imported.startsWith(packageRoot + '/')) {
        assert.equal(
          layer,
          'Demo',
          'Only the view may import external styling or UI support',
        );
        continue;
      }
      const targetLayer = relative(packageRoot, imported).split('/')[0];
      assert.ok(
        allowed[layer]?.has(targetLayer),
        `${relative(packageRoot, path)} imports ${specifier}`,
      );
      if (['.ts', '.tsx'].includes(extname(imported)))
        dependencies.push(imported);
    }
    graph.set(path, dependencies);
  }
  const visited = new Set<string>();
  function walk(path: string, ancestors: string[]) {
    assert.ok(
      !ancestors.includes(path),
      `Circular dependency: ${[...ancestors, path].map((p) => relative(packageRoot, p)).join(' -> ')}`,
    );
    if (visited.has(path)) return;
    for (const next of graph.get(path) ?? []) walk(next, [...ancestors, path]);
    visited.add(path);
  }
  for (const path of graph.keys()) walk(path, []);
});

void test('Both setup entries invoke the same installation and verification flow', () => {
  assert.equal(
    readFileSync(resolve(root, 'setup.sh'), 'utf8'),
    readFileSync(resolve(root, 'dev_setup.sh'), 'utf8'),
  );
  assert.match(
    readFileSync(resolve(root, 'setup.sh'), 'utf8'),
    /scripts\/setup_common\.sh/,
  );
  const shared = readFileSync(resolve(root, 'scripts/setup_common.sh'), 'utf8');
  assert.match(shared, /npm ci/);
  assert.match(shared, /npm run check/);
});
