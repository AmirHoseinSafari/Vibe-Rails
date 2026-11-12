// Runs the project's tests and answers one question: is every promise in the scope kept?
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const TAG = /\[(S\d+)\]/g;
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.vibe-rails']);

export function tagsIn(text) {
  return [...String(text).matchAll(TAG)].map((m) => m[1]);
}

// Result: { ok, total, failed, tests: [{name, status, message}] | null, tags: Set, tail }
// `tests` is null for stacks that only report pass/fail as a whole.
export function runTests(root, config) {
  const report = config.report || { format: 'exit-code' };
  const reportFile = report.file ? path.join(root, report.file) : null;
  if (reportFile) {
    fs.rmSync(reportFile, { force: true });
    fs.mkdirSync(path.dirname(reportFile), { recursive: true });
  }

  const run = spawnSync(config.commands.test, {
    cwd: root,
    shell: true,
    encoding: 'utf8',
    timeout: (config.testTimeoutSeconds || 600) * 1000,
    env: { ...process.env, CI: '1' },
  });
  const tail = ((run.stdout || '') + (run.stderr || '')).trim().split('\n').slice(-15).join('\n');

  if (report.format === 'jest-json') {
    if (!reportFile || !fs.existsSync(reportFile)) {
      return { ok: false, total: 0, failed: 0, tests: [], tags: new Set(), tail, crashed: true };
    }
    const tests = parseJestJson(JSON.parse(fs.readFileSync(reportFile, 'utf8')));
    const failed = tests.filter((t) => t.status === 'failed').length;
    return {
      ok: run.status === 0 && failed === 0,
      total: tests.length,
      failed,
      tests,
      tags: new Set(tests.flatMap((t) => tagsIn(t.name))),
      tail,
      crashed: run.status !== 0 && failed === 0,
    };
  }

  return {
    ok: run.status === 0,
    total: 0,
    failed: run.status === 0 ? 0 : 1,
    tests: null,
    tags: scanTags(root, new RegExp(config.testMatch || '\\.(test|spec)\\.')),
    tail,
    crashed: false,
  };
}

// Jest and Vitest write the same JSON shape.
export function parseJestJson(json) {
  const tests = [];
  for (const file of json.testResults || []) {
    for (const a of file.assertionResults || []) {
      tests.push({
        name: a.fullName || [...(a.ancestorTitles || []), a.title].join(' '),
        status: a.status === 'passed' ? 'passed' : a.status === 'failed' ? 'failed' : 'skipped',
        message: firstLine((a.failureMessages || [])[0]),
      });
    }
    // A file that fails to load has no assertions; report it as one failed test.
    if (file.status === 'failed' && !(file.assertionResults || []).length) {
      tests.push({ name: path.basename(file.name || 'test file'), status: 'failed', message: firstLine(file.message) });
    }
  }
  return tests;
}

function firstLine(text) {
  return String(text || '').split('\n').map((l) => l.trim()).find(Boolean)?.slice(0, 200) || '';
}

function testFiles(root, match) {
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name));
      } else if (match.test(entry.name)) {
        files.push(path.join(dir, entry.name));
      }
    }
  };
  walk(root);
  return files;
}

function scanTags(root, match) {
  const tags = new Set();
  for (const file of testFiles(root, match)) {
    for (const tag of tagsIn(fs.readFileSync(file, 'utf8'))) tags.add(tag);
  }
  return tags;
}

// A fingerprint of each scope item's tests, used to notice a test being changed after its
// promise was built. A test's text is the line carrying the tag plus the more-indented lines
// under it (and the closing line), which works for any reasonably formatted language.
export function testFingerprints(root, config) {
  const blocks = new Map();
  const indent = (line) => line.length - line.trimStart().length;
  for (const file of testFiles(root, new RegExp(config.testMatch || '\\.(test|spec)\\.'))) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, start) => {
      const tags = tagsIn(line);
      if (!tags.length) return;
      const block = [line.trim()];
      for (let i = start + 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        if (indent(lines[i]) <= indent(line)) {
          if (/^[)\]}]/.test(lines[i].trim())) block.push(lines[i].trim());
          break;
        }
        block.push(lines[i].trim());
      }
      for (const tag of tags) blocks.set(tag, [...(blocks.get(tag) || []), block.join('\n')]);
    });
  }
  const prints = new Map();
  for (const [tag, texts] of blocks) {
    prints.set(tag, crypto.createHash('sha256').update(texts.sort().join('\n---\n')).digest('hex').slice(0, 16));
  }
  return prints;
}

// How one scope item stands in a test run: 'missing' | 'failed' | 'passed' | 'skipped'.
export function itemResult(result, id) {
  if (!result.tags.has(id)) return 'missing';
  if (!result.tests) return result.ok ? 'passed' : 'failed';
  const mine = result.tests.filter((t) => tagsIn(t.name).includes(id));
  if (mine.some((t) => t.status === 'failed')) return 'failed';
  if (mine.some((t) => t.status === 'passed')) return 'passed';
  return 'skipped';
}

// The gate. Returns { ok, lines } with short, plain output.
export function gate(result, state) {
  const lines = [];
  if (result.crashed) {
    return { ok: false, lines: ['FAIL the tests could not run:', result.tail] };
  }
  if (!result.ok) {
    const failing = result.tests ? result.tests.filter((t) => t.status === 'failed') : [];
    lines.push(result.tests ? `FAIL ${result.failed} of ${result.total} tests failed` : 'FAIL the tests failed');
    for (const t of failing.slice(0, 10)) lines.push(`- ${t.name}${t.message ? ': ' + t.message : ''}`);
    if (failing.length > 10) lines.push(`- ...and ${failing.length - 10} more`);
    if (!failing.length) lines.push(result.tail);
    return { ok: false, lines };
  }

  const promised = state.scope.filter((i) => i.status === 'red' || i.status === 'done');
  const broken = [];
  for (const item of promised) {
    const status = itemResult(result, item.id);
    if (status === 'missing') broken.push(`- ${item.id} has no test. Put [${item.id}] in the name of the test that checks: ${item.text}`);
    if (status === 'skipped') broken.push(`- ${item.id} has a test, but it is switched off (skipped).`);
  }
  if (broken.length) {
    return { ok: false, lines: ['FAIL the tests pass, but the scope is not fully checked', ...broken] };
  }

  const waiting = state.scope.filter((i) => i.status === 'planned').map((i) => i.id);
  const count = result.tests ? `${result.total} tests passed` : 'tests passed';
  lines.push(`OK ${count} · ${promised.length} scope items checked${waiting.length ? ' · not built yet: ' + waiting.join(', ') : ''}`);
  return { ok: true, lines };
}
