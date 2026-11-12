// Small git helpers and the git hooks that make the test gate unavoidable.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export function git(root, args, options = {}) {
  const result = spawnSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    timeout: options.timeout,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  });
  return {
    ok: result.status === 0,
    out: (result.stdout || '').trim(),
    err: (result.stderr || '').trim(),
  };
}

const HOOK = `#!/bin/sh
# Installed by Vibe Rails. Blocks the save unless every test passes
# and every agreed scope item still has a passing test.
cli=$(cat "$(git rev-parse --git-dir)/vibe-rails-cli" 2>/dev/null)
[ -x "$cli" ] || cli=$(command -v vibe-rails)
if [ -z "$cli" ]; then
  echo "Vibe Rails: the vibe-rails tool was not found, so this save is blocked." >&2
  echo "Open this project in Claude Code with the Vibe Rails plugin enabled." >&2
  exit 1
fi
exec "$cli" check --hook
`;

export function installHooks(root) {
  const dir = path.join(root, '.git', 'hooks');
  if (!fs.existsSync(path.join(root, '.git'))) return;
  fs.mkdirSync(dir, { recursive: true });
  for (const name of ['pre-commit', 'pre-push']) {
    const file = path.join(dir, name);
    if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== HOOK) {
      fs.writeFileSync(file, HOOK, { mode: 0o755 });
    }
  }
}

// The git hooks need to find this tool even after the plugin updates and moves.
export function rememberCli(root) {
  const bin = process.env.VIBE_RAILS_BIN;
  const gitDir = path.join(root, '.git');
  if (!bin || !fs.existsSync(gitDir)) return;
  const file = path.join(gitDir, 'vibe-rails-cli');
  if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8').trim() !== bin) {
    fs.writeFileSync(file, bin + '\n');
  }
}

export function hasRemote(root) {
  return git(root, ['remote', 'get-url', 'origin']).ok;
}
