// End-to-end tests of the tool: each one drives the real CLI in a throwaway project.
// The "fake" stack stands in for a real test runner: tests.json lists test names and outcomes.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TOPICS } from '../src/lib/project.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const BIN = path.resolve(here, '..', 'bin', 'vibe-rails');
const FAKE = path.join(here, 'fixtures', 'fake-stack');
const GIT_ENV = {
  GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@example.com',
};

const ENV = { ...process.env, ...GIT_ENV, VIBE_RAILS_NO_OPEN: '1', VIBE_RAILS_GITHUB_CLIENT_ID: '' };

function run(cwd, args, input) {
  const result = spawnSync(BIN, args, { cwd, encoding: 'utf8', input, env: ENV });
  return { code: result.status, out: result.stdout + result.stderr };
}

function newProject() {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-rails-')));
  const dir = path.join(base, 'app');
  const created = run(base, ['init', dir, '--name', 'Demo App', '--template', FAKE]);
  assert.equal(created.code, 0, created.out);
  return dir;
}

function approvedProject(promises = ['A person can add a task']) {
  const dir = newProject();
  for (const topic of TOPICS) run(dir, ['brief', 'set', topic.id, `answer for ${topic.id}`]);
  for (const promise of promises) run(dir, ['scope', 'add', promise]);
  writeMockup(dir);
  run(dir, ['mockup', 'approve']);
  const approved = run(dir, ['approve']);
  assert.equal(approved.code, 0, approved.out);
  return dir;
}

function writeMockup(dir, body = '<h1>Demo</h1>') {
  fs.mkdirSync(path.join(dir, 'mockup'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'mockup', 'index.html'), body);
}

// Builds S<n> the proper way: failing test, proof, passing test, save.
function build(dir, id, others = []) {
  setTests(dir, [...others, { name: `[${id}] works`, status: 'failed' }]);
  const proven = run(dir, ['red', id]);
  assert.equal(proven.code, 0, proven.out);
  setTests(dir, [...others, { name: `[${id}] works`, status: 'passed' }]);
  const saved = run(dir, ['save', `build ${id}`, '--for', id]);
  assert.equal(saved.code, 0, saved.out);
  return [...others, { name: `[${id}] works`, status: 'passed' }];
}

function setTests(dir, tests) {
  fs.writeFileSync(path.join(dir, 'tests.json'), JSON.stringify([{ name: 'the app opens', status: 'passed' }, ...tests]));
}

const gitLog = (dir) => spawnSync('git', ['log', '--format=%B'], { cwd: dir, encoding: 'utf8' }).stdout;
const hookCall = (dir, kind, payload) => run(dir, ['hook', kind], JSON.stringify({ cwd: dir, ...payload }));

test('init creates a git repository with the gate installed and readable project files', () => {
  const dir = newProject();
  assert.ok(fs.existsSync(path.join(dir, '.git', 'hooks', 'pre-commit')));
  assert.ok(fs.existsSync(path.join(dir, '.git', 'hooks', 'pre-push')));
  assert.match(fs.readFileSync(path.join(dir, 'PROJECT.md'), 'utf8'), /# Demo App/);
  assert.match(fs.readFileSync(path.join(dir, 'SCOPE.md'), 'utf8'), /Nothing agreed yet/);
  assert.match(gitLog(dir), /Start Demo App/);
});

test('init refuses a folder that already has files', () => {
  const dir = newProject();
  assert.equal(run(dir, ['init', dir, '--template', FAKE]).code, 1);
});

test('approve is refused until every interview topic and at least one promise exist', () => {
  const dir = newProject();
  assert.match(run(dir, ['approve']).out, /topics still open/);
  for (const topic of TOPICS) run(dir, ['brief', 'set', topic.id, 'answer']);
  assert.match(run(dir, ['approve']).out, /not approved a mock-up/);
  writeMockup(dir);
  run(dir, ['mockup', 'approve']);
  assert.match(run(dir, ['approve']).out, /at least one promise/);
  run(dir, ['scope', 'add', 'A person can add a task']);
  writeMockup(dir, '<h1>Changed behind the user\'s back</h1>');
  assert.match(run(dir, ['approve']).out, /mock-up changed after the user approved/);
  run(dir, ['mockup', 'approve']);
  assert.equal(run(dir, ['approve']).code, 0);
  assert.match(gitLog(dir), /Plan approved/);
});

test('next walks through interview, promises, approval and the build loop', () => {
  const dir = newProject();
  assert.match(run(dir, ['next']).out, /purpose \(ask\)/);
  for (const topic of TOPICS) run(dir, ['brief', 'set', topic.id, 'answer']);
  assert.match(run(dir, ['next']).out, /mockup\/index\.html/);
  assert.match(run(dir, ['mockup', 'show']).out, /no mock-up yet/);
  writeMockup(dir);
  assert.match(run(dir, ['mockup', 'show']).out, /open in the user's browser/);
  run(dir, ['mockup', 'approve']);
  assert.match(run(dir, ['next']).out, /scope add/);
  run(dir, ['scope', 'add', 'A person can add a task']);
  assert.match(run(dir, ['next']).out, /vibe-rails approve/);
  run(dir, ['approve']);
  assert.match(run(dir, ['next']).out, /Next is S1/);
});

test('before approval: code edits are blocked, and so are build commands', () => {
  const dir = newProject();
  const edit = hookCall(dir, 'pre-tool-use', { tool_name: 'Write', tool_input: { file_path: path.join(dir, 'src', 'App.tsx') } });
  assert.equal(edit.code, 2);
  assert.match(edit.out, /approved the plan/);
  const mock = hookCall(dir, 'pre-tool-use', { tool_name: 'Write', tool_input: { file_path: path.join(dir, 'mockup', 'index.html') } });
  assert.equal(mock.code, 0, 'the mock-up may be written during planning');
  assert.equal(run(dir, ['red', 'S1']).code, 1);
  assert.equal(run(dir, ['save', 'x', '--tweak']).code, 1);
});

test('after approval: code edits are allowed, state files stay protected', () => {
  const dir = approvedProject();
  const call = (file) => hookCall(dir, 'pre-tool-use', { tool_name: 'Edit', tool_input: { file_path: path.join(dir, file) } }).code;
  assert.equal(call('src/App.tsx'), 0);
  assert.equal(call('.vibe-rails/state.json'), 2);
  assert.equal(call('SCOPE.md'), 2);
  assert.equal(call('.git/hooks/pre-commit'), 2);
});

test('direct git commit, push and hook tampering are blocked inside a project only', () => {
  const dir = approvedProject();
  const bash = (cwd, command) => hookCall(cwd, 'pre-tool-use', { tool_name: 'Bash', tool_input: { command } }).code;
  assert.equal(bash(dir, 'git commit -m "x" --no-verify'), 2);
  assert.equal(bash(dir, 'git add -A && git push'), 2);
  assert.equal(bash(dir, 'git config core.hooksPath /dev/null'), 2);
  assert.equal(bash(dir, 'echo {} > .vibe-rails/state.json'), 2);
  assert.equal(bash(path.dirname(dir), `cd ${dir} && git commit -m x`), 2);
  assert.equal(bash(dir, 'git status'), 0);
  assert.equal(bash(dir, 'vibe-rails save "x" --tweak'), 0);
  assert.equal(bash(os.tmpdir(), 'git commit -m "x"'), 0);
});

test('red: needs a tagged test, and that test must fail first', () => {
  const dir = approvedProject();
  assert.match(run(dir, ['red', 'S1']).out, /No test has \[S1\]/);

  setTests(dir, [{ name: '[S1] adds a task', status: 'passed' }]);
  assert.match(run(dir, ['red', 'S1']).out, /already passes/);

  setTests(dir, [{ name: '[S1] adds a task', status: 'skipped' }]);
  assert.match(run(dir, ['red', 'S1']).out, /switched off/);

  setTests(dir, [{ name: '[S1] adds a task', status: 'failed' }]);
  const proven = run(dir, ['red', 'S1']);
  assert.equal(proven.code, 0, proven.out);
  assert.match(run(dir, ['scope', 'list']).out, /S1 red/);
});

test('red --already-works is allowed but shows up in SCOPE.md', () => {
  const dir = approvedProject();
  setTests(dir, [{ name: '[S1] adds a task', status: 'passed' }]);
  assert.equal(run(dir, ['red', 'S1', '--already-works', 'the template does this']).code, 0);
  run(dir, ['save', 'check for S1', '--for', 'S1']);
  assert.match(fs.readFileSync(path.join(dir, 'SCOPE.md'), 'utf8'), /Already worked when its check was added/);
});

test('save: must say what it is for', () => {
  const dir = approvedProject();
  assert.match(run(dir, ['save', 'something']).out, /--for <ids>/);
  assert.match(run(dir, ['save', 'something', '--for', 'S1', '--tweak']).out, /--for <ids>/);
});

test('save: refuses an item whose test was never proven', () => {
  const dir = approvedProject();
  setTests(dir, [{ name: '[S1] adds a task', status: 'passed' }]);
  assert.match(run(dir, ['save', 'add tasks', '--for', 'S1']).out, /no proven test yet/);
});

test('save: blocked while a test fails, then commits with the scope recorded', () => {
  const dir = approvedProject();
  setTests(dir, [{ name: '[S1] adds a task', status: 'failed' }]);
  run(dir, ['red', 'S1']);

  const blocked = run(dir, ['save', 'add tasks', '--for', 'S1']);
  assert.equal(blocked.code, 1);
  assert.match(blocked.out, /FAIL 1 of 2 tests failed/);
  assert.match(blocked.out, /\[S1\] adds a task: expected true, got false/);
  assert.match(blocked.out, /Nothing was saved/);
  assert.doesNotMatch(gitLog(dir), /add tasks/);

  setTests(dir, [{ name: '[S1] adds a task', status: 'passed' }]);
  const saved = run(dir, ['save', 'add tasks', '--for', 'S1']);
  assert.equal(saved.code, 0, saved.out);
  assert.match(saved.out, /OK 2 tests passed · 1 scope items checked/);
  assert.match(gitLog(dir), /add tasks\n\nScope: S1/);
  assert.match(fs.readFileSync(path.join(dir, 'SCOPE.md'), 'utf8'), /\*\*S1\*\* A person can add a task — _Built and checked; waiting for you to try it\._/);
});

test('save: blocked when a built item loses its test or the test is switched off', () => {
  const dir = approvedProject();
  setTests(dir, [{ name: '[S1] adds a task', status: 'failed' }]);
  run(dir, ['red', 'S1']);
  setTests(dir, [{ name: '[S1] adds a task', status: 'passed' }]);
  run(dir, ['save', 'add tasks', '--for', 'S1']);

  setTests(dir, []);
  const missing = run(dir, ['save', 'tidy', '--tweak']);
  assert.equal(missing.code, 1);
  assert.match(missing.out, /S1 has no test/);

  setTests(dir, [{ name: '[S1] adds a task', status: 'skipped' }]);
  assert.match(run(dir, ['save', 'tidy', '--tweak']).out, /switched off/);
});

test('a bug becomes a scope item, and unbuilt items are listed but do not block', () => {
  const dir = approvedProject(['A person can add a task', 'A person can delete a task']);
  const added = run(dir, ['scope', 'add', '--bug', 'An empty task cannot be added']);
  assert.match(added.out, /S3 added\. Next: write a test with \[S3\]/);

  setTests(dir, [{ name: '[S3] ignores an empty task', status: 'failed' }]);
  run(dir, ['red', 'S3']);
  setTests(dir, [{ name: '[S3] ignores an empty task', status: 'passed' }]);
  const saved = run(dir, ['save', 'ignore empty tasks', '--for', 'S3']);
  assert.equal(saved.code, 0, saved.out);
  assert.match(saved.out, /not built yet: S1, S2/);
  assert.match(fs.readFileSync(path.join(dir, 'SCOPE.md'), 'utf8'), /\*\*S3\*\* \(fix\)/);
});

test('a dropped item no longer needs a test', () => {
  const dir = approvedProject();
  setTests(dir, [{ name: '[S1] adds a task', status: 'failed' }]);
  run(dir, ['red', 'S1']);
  run(dir, ['scope', 'drop', 'S1', 'the user changed their mind']);
  setTests(dir, []);
  assert.equal(run(dir, ['check']).code, 0);
  assert.match(fs.readFileSync(path.join(dir, 'SCOPE.md'), 'utf8'), /## Removed/);
});

test('the git hook itself blocks a plain git commit when the gate fails', () => {
  const dir = approvedProject();
  setTests(dir, [{ name: 'something else', status: 'failed' }]);
  fs.writeFileSync(path.join(dir, 'notes.txt'), 'hello');
  const git = (args) => spawnSync('git', args, { cwd: dir, encoding: 'utf8', env: { ...process.env, ...GIT_ENV } });
  git(['add', '-A']);
  const blocked = git(['commit', '-m', 'sneaky']);
  assert.notEqual(blocked.status, 0);
  assert.match(blocked.stdout + blocked.stderr, /FAIL 1 of 2 tests failed/);

  setTests(dir, []);
  git(['add', '-A']);
  assert.equal(git(['commit', '-m', 'honest']).status, 0);
});

test('session-start prints one status line in a project and nothing elsewhere', () => {
  const dir = approvedProject();
  assert.match(hookCall(dir, 'session-start', {}).out, /Vibe Rails project "Demo App" · building/);
  assert.equal(hookCall(os.tmpdir(), 'session-start', {}).out, '');
});

test('confirm records that the user tried it, and shows in SCOPE.md and next', () => {
  const dir = approvedProject();
  assert.match(run(dir, ['confirm', 'S1']).out, /not built yet/);
  build(dir, 'S1');
  assert.match(run(dir, ['next']).out, /Ask the user to try what was built[\s\S]*S1: A person can add a task/);
  assert.equal(run(dir, ['confirm', 'S1']).code, 0);
  assert.match(fs.readFileSync(path.join(dir, 'SCOPE.md'), 'utf8'), /Built, checked, and tried by you/);
  assert.match(run(dir, ['next']).out, /Everything agreed is built/);
});

test('no new promise can be started while three built ones wait for the user to try them', () => {
  const dir = approvedProject(['one', 'two', 'three', 'four']);
  let tests = [];
  for (const id of ['S1', 'S2', 'S3']) tests = build(dir, id, tests);
  assert.match(run(dir, ['next']).out, /Ask the user to try/);
  setTests(dir, [...tests, { name: '[S4] works', status: 'failed' }]);
  const blocked = run(dir, ['red', 'S4']);
  assert.equal(blocked.code, 1);
  assert.match(blocked.out, /has not tried S1, S2, S3/);
  run(dir, ['confirm', 'S1,S2']);
  assert.equal(run(dir, ['red', 'S4']).code, 0);
});

test('save: blocked when the test of a built promise is changed in a save about something else', () => {
  const dir = approvedProject(['one', 'two']);
  const file = path.join(dir, 'one.test.js');
  fs.writeFileSync(file, "test('[S1] works', () => {\n  expect(add(1, 1)).toBe(2);\n});\n");
  const tests = build(dir, 'S1');

  fs.writeFileSync(file, "test('[S1] works', () => {\n  expect(true).toBe(true);\n});\n");
  const blocked = run(dir, ['save', 'tidy', '--tweak']);
  assert.equal(blocked.code, 1);
  assert.match(blocked.out, /test for S1 was changed/);
  assert.match(blocked.out, /Nothing was saved/);

  // Adding another promise's test to the same file is fine.
  fs.writeFileSync(file, "test('[S1] works', () => {\n  expect(add(1, 1)).toBe(2);\n});\n\ntest('[S2] works', () => {\n  expect(1).toBe(1);\n});\n");
  build(dir, 'S2', tests);

  // Changing it on purpose is allowed when the save names the promise, and it must be tried again.
  run(dir, ['confirm', 'S1']);
  fs.writeFileSync(file, "test('[S1] works', () => {\n  expect(add(2, 2)).toBe(4);\n});\n\ntest('[S2] works', () => {\n  expect(1).toBe(1);\n});\n");
  const allowed = run(dir, ['save', 'S1 now adds bigger numbers', '--for', 'S1']);
  assert.equal(allowed.code, 0, allowed.out);
  assert.match(fs.readFileSync(path.join(dir, 'SCOPE.md'), 'utf8'), /\*\*S1\*\* one — _Built and checked; waiting for you to try it/);
});

test('undo: throws away unsaved work but keeps the promises, with a backup', () => {
  const dir = approvedProject(['one', 'two']);
  const tests = build(dir, 'S1');
  fs.writeFileSync(path.join(dir, 'broken.js'), 'oops');
  fs.writeFileSync(path.join(dir, 'tests.json'), 'not even json');
  run(dir, ['scope', 'add', '--bug', 'three']);
  assert.match(run(dir, ['undo']).out, /Back to the last saved version \("build S1"\)/);

  assert.ok(!fs.existsSync(path.join(dir, 'broken.js')));
  assert.equal(run(dir, ['check']).code, 0);
  assert.match(run(dir, ['scope', 'list']).out, /S1 done[\s\S]*S3 planned bug: three/);
  const backup = spawnSync('git', ['show', 'refs/vibe-rails/undo-backup:broken.js'], { cwd: dir, encoding: 'utf8' });
  assert.equal(backup.stdout, 'oops');

  // A promise that was half-built starts over, because its test went with the undo.
  setTests(dir, [...tests, { name: '[S2] works', status: 'failed' }]);
  run(dir, ['red', 'S2']);
  assert.match(run(dir, ['undo']).out, /S2 will be built again from the start/);
  assert.match(run(dir, ['scope', 'list']).out, /S2 planned/);
  assert.match(run(dir, ['undo']).out, /no unsaved work/);
});

test('undo --last-save: reverts the save and puts its promise back to not built', () => {
  const dir = approvedProject(['one', 'two']);
  const tests = build(dir, 'S1');
  fs.writeFileSync(path.join(dir, 'feature-two.js'), 'code');
  build(dir, 'S2', tests);

  fs.writeFileSync(path.join(dir, 'unsaved.js'), 'x');
  assert.match(run(dir, ['undo', '--last-save']).out, /unsaved work/);
  run(dir, ['undo']);

  const undone = run(dir, ['undo', '--last-save']);
  assert.equal(undone.code, 0, undone.out);
  assert.match(undone.out, /Undone: "build S2"\. S2 is back to "not built yet"/);
  assert.ok(!fs.existsSync(path.join(dir, 'feature-two.js')));
  assert.match(run(dir, ['scope', 'list']).out, /S1 done[\s\S]*S2 planned/);
  assert.equal(run(dir, ['check']).code, 0);
  assert.match(gitLog(dir), /Undo: build S2\n\nScope: undo/);
  assert.match(run(dir, ['undo', '--last-save']).out, /cannot be undone this way/);
});

// ---------- GitHub connection, against a pretend GitHub ----------

function runAsync(cwd, args, env) {
  return new Promise((resolve) => {
    const child = spawn(BIN, args, { cwd, env: { ...ENV, ...env } });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    child.on('close', (code) => resolve({ code, out }));
  });
}

async function fakeGitHub(t) {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-rails-gh-')));
  const bare = path.join(base, 'remote.git');
  spawnSync('git', ['init', '--bare', '-b', 'main', bare]);
  const world = { authorized: false, taken: [], created: [] };
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (d) => { body += d; });
    req.on('end', () => {
      const data = body ? JSON.parse(body) : {};
      const reply = (status, json) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(json)); };
      const signedIn = req.headers.authorization === 'Bearer token-123';
      if (req.url === '/login/device/code') {
        return reply(200, { device_code: 'dev-1', user_code: 'WDJB-MJHT', verification_uri: 'https://github.com/login/device', interval: 0, expires_in: 900 });
      }
      if (req.url === '/login/oauth/access_token') {
        return reply(200, world.authorized ? { access_token: 'token-123' } : { error: 'authorization_pending' });
      }
      if (req.url === '/user') return signedIn ? reply(200, { login: 'ada' }) : reply(401, {});
      if (req.url === '/user/repos') {
        if (!signedIn) return reply(401, {});
        if (world.taken.includes(data.name)) return reply(422, {});
        world.created.push(data);
        return reply(201, { clone_url: bare, html_url: `https://github.com/ada/${data.name}` });
      }
      return reply(404, {});
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const url = `http://127.0.0.1:${server.address().port}`;
  // A private git config, so the test never touches the real credential storage of this computer.
  const gitconfig = path.join(base, 'gitconfig');
  const credentials = path.join(base, 'credentials');
  fs.writeFileSync(gitconfig, `[credential]\n\thelper = store --file ${credentials}\n`);
  const env = {
    VIBE_RAILS_GITHUB_WEB: url, VIBE_RAILS_GITHUB_API: url, VIBE_RAILS_GITHUB_CLIENT_ID: 'test-client',
    VIBE_RAILS_POLL_MS: '0', GIT_CONFIG_GLOBAL: gitconfig, GIT_CONFIG_NOSYSTEM: '1',
  };
  return { world, env, bare, credentials };
}

test('connect: signs in with a code, creates a private repository and uploads', async (t) => {
  const gh = await fakeGitHub(t);
  const dir = approvedProject();

  const first = await runAsync(dir, ['connect'], gh.env);
  assert.equal(first.code, 0, first.out);
  assert.match(first.out, /Open https:\/\/github\.com\/login\/device/);
  assert.match(first.out, /Type this code: WDJB-MJHT/);

  const waiting = await runAsync(dir, ['connect'], gh.env);
  assert.match(waiting.out, /Still waiting for the user to type the code WDJB-MJHT/);

  gh.world.authorized = true;
  const done = await runAsync(dir, ['connect'], gh.env);
  assert.equal(done.code, 0, done.out);
  assert.match(done.out, /Backed up on GitHub, visible only to the user: https:\/\/github\.com\/ada\/demo-app/);
  assert.deepEqual(gh.world.created, [{ name: 'demo-app', private: true }]);
  assert.match(spawnSync('git', ['log', '--format=%s', 'main'], { cwd: gh.bare, encoding: 'utf8' }).stdout, /Plan approved/);
  assert.match(fs.readFileSync(gh.credentials, 'utf8'), /ada:token-123@127\.0\.0\.1/);
  assert.ok(!fs.existsSync(path.join(dir, '.git', 'vibe-rails-github.json')));

  // Later saves go to GitHub too.
  build(dir, 'S1');
  assert.match(spawnSync('git', ['log', '--format=%s', 'main'], { cwd: gh.bare, encoding: 'utf8' }).stdout, /build S1/);
});

test('connect: reuses a stored sign-in, and asks for another name when the name is taken', async (t) => {
  const gh = await fakeGitHub(t);
  fs.writeFileSync(gh.credentials, `http://ada:token-123@${new URL(gh.env.VIBE_RAILS_GITHUB_WEB).host}\n`);
  gh.world.taken.push('demo-app');
  const dir = approvedProject();

  const taken = await runAsync(dir, ['connect'], gh.env);
  assert.equal(taken.code, 1);
  assert.match(taken.out, /already has a repository called "demo-app"/);

  const renamed = await runAsync(dir, ['connect', '--name', 'demo-app-2'], gh.env);
  assert.equal(renamed.code, 0, renamed.out);
  assert.match(renamed.out, /ada\/demo-app-2/);
});

test('connect: without a registered GitHub app it explains the manual way', async () => {
  const dir = approvedProject();
  const result = await runAsync(dir, ['connect'], { VIBE_RAILS_GITHUB_CLIENT_ID: '' });
  assert.equal(result.code, 1);
  assert.match(result.out, /github\.com\/new/);
});

test('hooks.json: each hook command runs the way Claude Code runs it and gives the expected verdict', () => {
  const dir = approvedProject();
  const pluginRoot = path.resolve(here, '..');
  const { hooks } = JSON.parse(fs.readFileSync(path.join(pluginRoot, 'hooks', 'hooks.json'), 'utf8'));
  const fire = (event, payload) => {
    const [{ hooks: [hookDef], matcher }] = hooks[event];
    const result = spawnSync(hookDef.command, {
      shell: true, cwd: dir, encoding: 'utf8', input: JSON.stringify({ cwd: dir, hook_event_name: event, ...payload }),
      env: { ...ENV, CLAUDE_PLUGIN_ROOT: pluginRoot },
    });
    return { code: result.status, out: result.stdout + result.stderr, matcher };
  };

  assert.match(fire('SessionStart', { source: 'startup' }).out, /Vibe Rails project "Demo App"/);
  const commit = fire('PreToolUse', { tool_name: 'Bash', tool_input: { command: 'git commit -m x' } });
  assert.equal(commit.code, 2);
  assert.match(commit.out, /vibe-rails save/);
  for (const tool of ['Bash', 'Write', 'Edit']) assert.match(tool, new RegExp(`^(${commit.matcher})$`));
  assert.equal(fire('PreToolUse', { tool_name: 'Bash', tool_input: { command: 'ls' } }).code, 0);
});
