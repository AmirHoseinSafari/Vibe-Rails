// Claude Code hooks. These run outside the AI's control, which is what makes the rules hold:
// - session-start: one status line, so the AI knows where the project stands (costs a few tokens).
// - pre-tool-use: refuses actions that would skip the process.
import fs from 'node:fs';
import path from 'node:path';
import { DIR, findRoot, load } from './lib/project.js';
import { installHooks, rememberCli } from './lib/git.js';
import { statusLine } from './commands.js';

const GENERATED = new Set(['PROJECT.md', 'SCOPE.md']);

export function hook(kind) {
  let input = {};
  try {
    input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
  } catch {
    return 0; // Never break the session over unreadable hook input.
  }
  const cwd = input.cwd || process.cwd();

  if (kind === 'session-start') {
    const root = findRoot(cwd);
    if (!root) return 0;
    installHooks(root);
    rememberCli(root);
    const { config, state } = load(root);
    console.log(`${statusLine(config, state)}. Before doing anything in this project, run: vibe-rails next`);
    return 0;
  }

  if (kind === 'pre-tool-use') {
    const reason = input.tool_name === 'Bash'
      ? checkBash(cwd, input.tool_input?.command || '')
      : checkEdit(cwd, input.tool_input?.file_path || input.tool_input?.notebook_path || '');
    if (reason) {
      console.error(`Vibe Rails: ${reason}`);
      return 2; // Exit code 2 blocks the tool call and shows the reason to the AI.
    }
  }
  return 0;
}

export function checkEdit(cwd, filePath) {
  if (!filePath) return null;
  const file = path.resolve(cwd, filePath);
  const root = findRoot(path.dirname(file));
  if (!root) return null;
  const relative = path.relative(root, file);
  const top = relative.split(path.sep)[0];

  if (top === DIR || top === '.git') {
    return 'these files are managed by the vibe-rails tool. Change them with its commands (run: vibe-rails help).';
  }
  if (GENERATED.has(relative)) {
    return `${relative} is rebuilt automatically. Change it with: vibe-rails brief set ...  or  vibe-rails scope ...`;
  }
  if (load(root).state.phase !== 'build' && top !== 'mockup') {
    return 'only the mock-up (mockup/index.html) may be written until the user has approved the plan. Run: vibe-rails next';
  }
  return null;
}

export function checkBash(cwd, command) {
  const roots = projectRoots(cwd, command);
  if (!roots.length) return null;

  if (/core\.hooksPath|\.git\/hooks/.test(command)) {
    return 'the git hooks are the test gate and may not be changed.';
  }
  if (/\bgit\b[^|;&\n]*\s(commit|push)\b/.test(command)) {
    return 'saving goes through the test gate. Use: vibe-rails save "<what changed>" --for <ids>  (or --tweak)';
  }
  if (new RegExp(`(>|\\b(rm|mv|cp|tee|sed|touch|truncate)\\b)[^|;&\\n]*\\${DIR}\\b`).test(command)) {
    return 'the project state may only be changed with vibe-rails commands (run: vibe-rails help).';
  }
  return null;
}

// A command can target a project from elsewhere (cd <dir>, git -C <dir>), so look at those too.
function projectRoots(cwd, command) {
  const places = [cwd];
  for (const match of command.matchAll(/(?:\bcd|-C)\s+("([^"]+)"|'([^']+)'|(\S+))/g)) {
    places.push(path.resolve(cwd, match[2] || match[3] || match[4]));
  }
  return [...new Set(places.map((p) => findRoot(p)).filter(Boolean))];
}
