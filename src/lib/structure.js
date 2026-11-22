// Keeps the app's code easy to change as it grows. Three rules, set per stack in stack.json
// under "structure" and checked by the gate before every save:
//   - no source file longer than maxFileLines (long files are where vibe-coded apps start to rot);
//   - saved data is read and written only under storage.only, so how data is kept can change in one place;
//   - each area of the app (a folder under `modules`) is used by the rest only through its front door,
//     its index file, so one area can change inside without breaking another.
// Test files and the paths in `ignore` are exempt. Import checks understand JavaScript and TypeScript.
import fs from 'node:fs';
import path from 'node:path';

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.vibe-rails']);
const TEST_FILE = /\.(test|spec)\.[^.]+$/;
// Relative specifiers in: import x from '..', export { x } from '..', import '..', import('..').
const IMPORT = /(?:\bfrom|\bimport)\s*\(?\s*['"](\.{1,2}(?:\/[^'"]*)?)['"]/g;
const CODE_EXT = /\.(tsx?|jsx?|mjs|cjs)$/;
// How close to the limit a file may get before the gate suggests starting a new one.
const NEAR = 0.8;

function sourceFiles(root, structure) {
  const exts = new Set(structure.extensions || ['ts', 'tsx', 'js', 'jsx']);
  const ignore = structure.ignore || [];
  const files = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, entry.name);
      const rel = path.relative(root, full).split(path.sep).join('/');
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(full);
      } else if (exts.has(entry.name.split('.').pop()) && !TEST_FILE.test(entry.name) && !ignore.some((p) => rel.startsWith(p))) {
        files.push(rel);
      }
    }
  };
  walk(path.join(root, structure.sourceDir || 'src'));
  return files;
}

// Comments may mention anything; only code counts. (Rough, but errs on the side of not blocking.)
const withoutComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"])\/\/[^\n]*/g, '$1').replace(/^\s*#[^\n]*/gm, '');

const lineCount = (text) => text.replace(/\n+$/, '').split('\n').length;

// The area a path belongs to, or null if it is not inside the modules folder.
function areaOf(rel, modules) {
  if (!modules || !rel.startsWith(modules)) return null;
  return rel.slice(modules.length).split('/')[0] || null;
}

// Returns { problems: [line], near: [line], summary } with short lines ready to show.
export function checkStructure(root, structure) {
  const files = sourceFiles(root, structure);
  const limit = structure.maxFileLines;
  const modules = structure.modules ? structure.modules.replace(/\/?$/, '/') : null;
  const storage = structure.storage ? new RegExp(structure.storage.pattern) : null;
  const problems = [];
  const near = [];
  let largest = 0;

  for (const rel of files) {
    const text = fs.readFileSync(path.join(root, rel), 'utf8');
    const lines = lineCount(text);
    largest = Math.max(largest, lines);
    if (limit && lines > limit) {
      problems.push(`- ${rel} has ${lines} lines; the limit is ${limit}. Split it into smaller files${modules ? ` (one area of the app per folder in ${modules})` : ''}. The tests make this safe.`);
    } else if (limit && lines >= Math.ceil(limit * NEAR)) {
      near.push(`${rel} (${lines} of ${limit} lines)`);
    }

    const code = withoutComments(text);
    if (storage && !rel.startsWith(structure.storage.only)) {
      const found = storage.exec(code);
      if (found) problems.push(`- ${rel} reads or writes saved data directly (${found[0]}). Only files in ${structure.storage.only} may; use them instead.`);
    }

    const mine = areaOf(rel, modules);
    if (modules && CODE_EXT.test(rel)) {
      for (const [, spec] of code.matchAll(IMPORT)) {
        const target = path.posix.normalize(path.posix.join(path.posix.dirname(rel), spec));
        const area = areaOf(target + '/', modules);
        if (!area || area === mine) continue;
        const front = target.replace(CODE_EXT, '').replace(/\/$/, '').replace(/\/index$/, '');
        if (front !== modules + area) {
          problems.push(`- ${rel} reaches inside another area (${target}). Import from ${modules}${area} instead, and export what is needed from its index file.`);
        }
      }
    }
  }

  return {
    problems,
    near: near.length ? [`Near the limit: ${near.join(', ')}. Put new code in new files.`] : [],
    summary: `structure: ${files.length} files, largest ${largest} lines${limit ? ` (limit ${limit})` : ''}`,
  };
}
