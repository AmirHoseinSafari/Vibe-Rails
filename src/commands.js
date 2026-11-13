// One function per command. Each returns an exit code: 0 fine, 1 blocked.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import {
  DIR, MAX_UNTRIED, TOPICS, UserError, findItem, load, missingTopics, newState, requireRoot, saveState, slugify,
  summary, today, untried, writeJson,
} from './lib/project.js';
import { git, hasRemote, installHooks, rememberCli } from './lib/git.js';
import { gate, itemResult, runTests, testFingerprints } from './lib/tests.js';
import * as github from './lib/github.js';

const TEMPLATES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'templates');
const DEFAULT_TEMPLATE = 'web-basic';
const say = (...lines) => console.log(lines.join('\n'));

function textArg(value, what) {
  const text = (value === '-' ? fs.readFileSync(0, 'utf8') : value || '').trim();
  if (!text) throw new UserError(`Missing ${what}.`);
  return text;
}

function open() {
  const root = requireRoot();
  return { root, ...load(root) };
}

function templateDir(name = DEFAULT_TEMPLATE) {
  const dir = fs.existsSync(path.join(name, 'stack.json')) ? path.resolve(name) : path.join(TEMPLATES, name);
  if (!fs.existsSync(path.join(dir, 'stack.json'))) throw new UserError(`There is no project template called "${name}".`);
  return dir;
}

// ---------- setup ----------

export function doctor() {
  const stack = JSON.parse(fs.readFileSync(path.join(templateDir(), 'stack.json'), 'utf8'));
  const problems = [];
  const nodeMajor = Number(process.versions.node.split('.')[0]);
  if (nodeMajor < stack.nodeMajor) {
    problems.push(`Node.js is too old (${process.versions.node}). Install the LTS version from https://nodejs.org`);
  }
  if (spawnSync('git', ['--version']).status !== 0) {
    problems.push('Git is not installed. On a Mac, run: xcode-select --install');
  } else {
    for (const key of ['user.name', 'user.email']) {
      if (!git(process.cwd(), ['config', key]).out) {
        problems.push(`Git does not know the user's ${key === 'user.name' ? 'name' : 'email'}. Ask them, then run: git config --global ${key} "<value>"`);
      }
    }
  }
  if (spawnSync('npm', ['--version'], { shell: true }).status !== 0) problems.push('npm is missing. It comes with Node.js from https://nodejs.org');

  if (!problems.length) {
    say('OK this computer is ready.');
    return 0;
  }
  say('NOT READY', ...problems.map((p) => `- ${p}`));
  return 1;
}

export function init({ args, flags }) {
  const target = path.resolve(textArg(args[0], 'the folder for the new project'));
  const name = textArg(flags.name || path.basename(target), 'the project name');
  if (fs.existsSync(target) && fs.readdirSync(target).length) {
    throw new UserError(`The folder ${target} already has files in it. Choose a new folder.`);
  }
  const template = templateDir(flags.template);
  const stack = JSON.parse(fs.readFileSync(path.join(template, 'stack.json'), 'utf8'));
  const slug = slugify(name);

  copyTemplate(path.join(template, 'files'), target, { name, slug });
  const config = {
    version: 1,
    name,
    stack: stack.name,
    commands: stack.commands,
    report: stack.report,
    testMatch: stack.testMatch,
  };
  writeJson(path.join(target, DIR, 'config.json'), config);
  fs.writeFileSync(path.join(target, DIR, '.gitignore'), 'tmp/\n');
  saveState(target, config, newState());

  if (!git(target, ['init', '-b', 'main']).ok) throw new UserError('Could not create the git repository. Run: vibe-rails doctor');
  installHooks(target);
  rememberCli(target);

  const notes = [];
  if (!flags['no-install'] && stack.commands.install) {
    const install = spawnSync(stack.commands.install, { cwd: target, shell: true, encoding: 'utf8' });
    if (install.status !== 0) notes.push(`Installing the building blocks failed. In the project folder, run: ${stack.commands.install}`);
  }
  git(target, ['add', '-A']);
  const commit = git(target, ['commit', '--no-verify', '-m', `Start ${name}`]);
  if (!commit.ok) notes.push('The first save failed. Run: vibe-rails doctor');

  say(`Created "${name}" in ${target}`, ...notes, 'Next: work inside that folder and run: vibe-rails next');
  return notes.length ? 1 : 0;
}

function copyTemplate(from, to, values) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name);
    // npm drops files named .gitignore when publishing, so templates store it without the dot.
    const dest = path.join(to, entry.name === 'gitignore' ? '.gitignore' : entry.name);
    if (entry.isDirectory()) {
      copyTemplate(source, dest, values);
    } else {
      const text = fs.readFileSync(source, 'utf8').replace(/\{\{(name|slug)\}\}/g, (_, key) => values[key]);
      fs.writeFileSync(dest, text);
    }
  }
}

// ---------- interview ----------

export function brief({ args }) {
  const { root, config, state } = open();
  if (args[0] === 'show') {
    say(...TOPICS.map((t) => `${t.id}: ${state.brief[t.id] || '(not answered)'}`));
    return 0;
  }
  if (args[0] !== 'set') throw new UserError('Use: vibe-rails brief set <topic> "<answer>"  or  vibe-rails brief show');
  const topic = TOPICS.find((t) => t.id === args[1]);
  if (!topic) throw new UserError(`Unknown topic "${args[1]}". Topics: ${TOPICS.map((t) => t.id).join(', ')}`);
  state.brief[topic.id] = textArg(args[2], 'the answer');
  saveState(root, config, state);
  const left = missingTopics(state).map((t) => t.id);
  say(`Recorded ${topic.id}.${left.length ? ' Still to cover: ' + left.join(', ') : ' All topics covered. Run: vibe-rails next'}`);
  return 0;
}

export function scope({ args, flags }) {
  const { root, config, state } = open();
  const action = args[0];

  if (action === 'list') {
    const live = state.scope.filter((i) => i.status !== 'dropped');
    say(...(live.length ? live.map((i) => `${i.id} ${i.status}${i.type === 'bug' ? ' bug' : ''}: ${i.text}`) : ['(no scope items yet)']));
    return 0;
  }
  if (action === 'add') {
    const item = {
      id: `S${state.nextId++}`,
      type: flags.bug ? 'bug' : 'feature',
      text: textArg(args[1], 'the promise, in plain words'),
      status: 'planned',
      added: today(),
    };
    state.scope.push(item);
    saveState(root, config, state);
    const step = state.phase === 'build' ? ` Next: write a test with [${item.id}] in its name, then run: vibe-rails red ${item.id}` : '';
    say(`${item.id} added.${step}`);
    return 0;
  }
  if (action === 'edit') {
    const item = findItem(state, args[1]);
    item.text = textArg(args[2], 'the new wording');
    saveState(root, config, state);
    say(`${item.id} reworded. Make sure its test still checks the new wording.`);
    return 0;
  }
  if (action === 'drop') {
    const item = findItem(state, args[1]);
    item.dropReason = textArg(args[2], 'the reason (the user must have agreed to remove it)');
    item.status = 'dropped';
    saveState(root, config, state);
    say(`${item.id} removed from the scope. Remove its test too.`);
    return 0;
  }
  throw new UserError('Use: vibe-rails scope add|list|edit|drop');
}

// ---------- mock-up ----------

const MOCKUP = path.join('mockup', 'index.html');

function mockupHash(root) {
  const dir = path.join(root, 'mockup');
  if (!fs.existsSync(path.join(root, MOCKUP))) return null;
  const hash = crypto.createHash('sha256');
  const walk = (folder) => {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(folder, entry.name);
      if (entry.isDirectory()) walk(file);
      else hash.update(path.relative(dir, file)).update(fs.readFileSync(file));
    }
  };
  walk(dir);
  return hash.digest('hex').slice(0, 16);
}

const mockupApproved = (root, state) => Boolean(state.mockup) && state.mockup.hash === mockupHash(root);

export function mockup({ args }) {
  const { root, config, state } = open();
  const hash = mockupHash(root);
  if (!hash) throw new UserError(`There is no mock-up yet. Write it as one self-contained file: ${MOCKUP}`);
  const file = path.join(root, MOCKUP);

  if (args[0] === 'show') {
    if (!process.env.VIBE_RAILS_NO_OPEN) {
      spawnSync(process.platform === 'darwin' ? 'open' : 'xdg-open', [file], { stdio: 'ignore' });
    }
    say(`The mock-up is open in the user's browser (${file}).`, 'Ask what they would change. When they clearly say it is right, run: vibe-rails mockup approve');
    return 0;
  }
  if (args[0] === 'approve') {
    state.mockup = { approved: today(), hash };
    saveState(root, config, state);
    say('Mock-up approved. Run: vibe-rails next');
    return 0;
  }
  throw new UserError('Use: vibe-rails mockup show  or  vibe-rails mockup approve');
}

export function approve() {
  const { root, config, state } = open();
  if (state.phase === 'build') {
    say('The plan is already approved. Run: vibe-rails next');
    return 0;
  }
  const missing = missingTopics(state).map((t) => t.id);
  if (missing.length) throw new UserError(`Not ready to approve. Interview topics still open: ${missing.join(', ')}`);
  if (!mockupApproved(root, state)) {
    throw new UserError(
      state.mockup
        ? 'Not ready to approve. The mock-up changed after the user approved it. Show it again: vibe-rails mockup show'
        : 'Not ready to approve. The user has not approved a mock-up yet. Run: vibe-rails next',
    );
  }
  if (!state.scope.some((i) => i.status === 'planned')) {
    throw new UserError('Not ready to approve. Add at least one promise first: vibe-rails scope add "<what the app must do>"');
  }
  state.phase = 'build';
  state.approved = today();
  saveState(root, config, state);
  git(root, ['add', '-A']);
  git(root, ['commit', '--no-verify', '-m', 'Plan approved']);
  say('Plan approved. Building is unlocked. Run: vibe-rails next');
  return 0;
}

// ---------- build ----------

function requireBuild(state) {
  if (state.phase !== 'build') throw new UserError('The plan is not approved yet. Run: vibe-rails next');
}

export function red({ args, flags }) {
  const { root, config, state } = open();
  requireBuild(state);
  const item = findItem(state, args[0]);
  if (item.status === 'done') throw new UserError(`${item.id} is already built. For a change in behaviour, add a new scope item.`);
  if (item.status === 'dropped') throw new UserError(`${item.id} was removed from the scope.`);
  const waiting = untried(state);
  if (item.status === 'planned' && waiting.length >= MAX_UNTRIED) {
    throw new UserError(
      `The user has not tried ${waiting.map((i) => i.id).join(', ')} yet. Let them try those before building more. Run: vibe-rails next`,
    );
  }

  const outcome = itemResult(runTests(root, config), item.id);
  if (outcome === 'missing') throw new UserError(`No test has [${item.id}] in its name. Write one that checks: ${item.text}`);
  if (outcome === 'skipped') throw new UserError(`The test for ${item.id} is switched off (skipped). Switch it on.`);
  if (outcome === 'passed') {
    if (flags['already-works'] === undefined) {
      throw new UserError(
        `The test for ${item.id} already passes, so it does not prove anything yet. ` +
        `If the app really did this already, run: vibe-rails red ${item.id} --already-works "<why>". Otherwise make the test stricter.`,
      );
    }
    item.red = { at: today(), mode: 'already-works', note: textArg(flags['already-works'], 'the reason') };
  } else {
    item.red = { at: today(), mode: 'failed' };
  }
  item.status = 'red';
  saveState(root, config, state);
  say(
    outcome === 'passed'
      ? `${item.id} recorded as already working. Save with: vibe-rails save "<what changed>" --for ${item.id}`
      : `${item.id} test fails as it should. Now build it until the test passes, then: vibe-rails save "<what changed>" --for ${item.id}`,
  );
  return 0;
}

export function check() {
  const { root, config, state } = open();
  const result = gate(runTests(root, config), state);
  say(...result.lines);
  return result.ok ? 0 : 1;
}

export const test = check;

export async function save({ args, flags }) {
  const { root, config, state } = open();
  requireBuild(state);
  const message = textArg(args[0], 'a short description of what changed');
  if (Boolean(flags.for) === Boolean(flags.tweak)) {
    throw new UserError(
      'Say what this save is for: --for <ids> (the scope items it builds or fixes), ' +
      'or --tweak (a small change that adds no behaviour, such as wording or colours).',
    );
  }

  const items = flags.for ? String(flags.for).split(',').map((id) => findItem(state, id.trim())) : [];
  for (const item of items) {
    if (item.status === 'planned') throw new UserError(`${item.id} has no proven test yet. Write it, then run: vibe-rails red ${item.id}`);
    if (item.status === 'dropped') throw new UserError(`${item.id} was removed from the scope.`);
  }

  const result = gate(runTests(root, config), state);
  if (!result.ok) {
    say(...result.lines, 'Nothing was saved.');
    return 1;
  }

  // A built promise's test may only change in a save that names that promise.
  const prints = testFingerprints(root, config);
  const changed = state.scope.filter(
    (i) => i.status === 'done' && !items.includes(i) && i.testPrint && prints.get(i.id) !== i.testPrint,
  );
  if (changed.length) {
    say(
      `FAIL the test for ${changed.map((i) => i.id).join(', ')} was changed, but this save is not about ${changed.length > 1 ? 'them' : 'it'}.`,
      ...changed.map((i) => `- ${i.id}: ${i.text}`),
      'Put the test back as it was. If the user agreed that this promise should work differently, name it in the save: --for <ids>',
      'Nothing was saved.',
    );
    return 1;
  }

  for (const item of items) {
    if (item.status !== 'done' || prints.get(item.id) !== item.testPrint) delete item.confirmed;
    item.status = 'done';
    item.testPrint = prints.get(item.id);
  }
  saveState(root, config, state);
  git(root, ['add', '-A']);
  if (!git(root, ['status', '--porcelain']).out) {
    say('Nothing new to save.');
    return 0;
  }
  const trailer = `Scope: ${items.length ? items.map((i) => i.id).join(', ') : 'tweak'}`;
  const commit = git(root, ['commit', '--no-verify', '-m', message, '-m', trailer]);
  if (!commit.ok) throw new UserError(`The save failed: ${commit.err.split('\n')[0]}`);

  const lines = [result.lines[0], `Saved: ${message}`];
  if (hasRemote(root)) {
    const { problem, lapsed } = await upload(root);
    if (!problem) lines.push('Sent to GitHub.');
    else if (lapsed) lines.push(`Saved on this computer, but ${SIGN_IN_AGAIN}`);
    else lines.push(`Saved on this computer, but GitHub could not be reached: ${problem}`);
  } else {
    lines.push(state.backup === 'local' ? 'Saved on this computer.' : 'Saved on this computer. (Online backup is optional: vibe-rails next explains.)');
  }
  if (items.length) {
    lines.push(`Now let the user try it (vibe-rails preview). When they say it works, run: vibe-rails confirm ${items.map((i) => i.id).join(',')}`);
  }
  say(...lines);
  return 0;
}

export function confirm({ args }) {
  const { root, config, state } = open();
  const items = textArg(args[0], 'the ids the user tried, such as S1,S2').split(',').map((id) => findItem(state, id.trim()));
  for (const item of items) {
    if (item.status !== 'done') throw new UserError(`${item.id} is not built yet, so the user cannot have tried it.`);
  }
  for (const item of items) item.confirmed = today();
  saveState(root, config, state);
  say(`Recorded: the user tried ${items.map((i) => i.id).join(', ')} and it works. Run: vibe-rails next`);
  return 0;
}

export async function undo({ flags }) {
  const { root, config, state } = open();
  // Work means the app's files. The tool's own records are kept across an undo, so they do not count.
  const records = [`${DIR}/state.json`, 'PROJECT.md', 'SCOPE.md'];
  const dirty = git(root, ['status', '--porcelain', '--', '.', ...records.map((f) => `:!${f}`)]).out;

  if (flags['last-save']) {
    if (dirty) throw new UserError('There is unsaved work. Undo that first with: vibe-rails undo');
    const subject = git(root, ['log', '-1', '--format=%s']).out;
    const scope = /^Scope: (.+)$/m.exec(git(root, ['log', '-1', '--format=%b']).out)?.[1];
    if (!scope || scope === 'undo') throw new UserError('The last thing saved cannot be undone this way.');
    git(root, ['checkout', 'HEAD', '--', ...records]);
    if (!git(root, ['revert', '--no-commit', 'HEAD']).ok) {
      git(root, ['revert', '--abort']);
      saveState(root, config, state);
      throw new UserError('That save could not be undone automatically.');
    }
    // Keep today's promises and answers; only what that save built goes back to "not built yet".
    const back = structuredClone(state);
    const ids = scope === 'tweak' ? [] : scope.split(', ');
    for (const item of back.scope) {
      if (ids.includes(item.id) && item.status !== 'dropped') {
        item.status = 'planned';
        delete item.red;
        delete item.confirmed;
        delete item.testPrint;
      }
    }
    saveState(root, config, back);
    const result = gate(runTests(root, config), back);
    if (!result.ok) {
      git(root, ['reset', '--hard', 'HEAD']);
      saveState(root, config, state);
      say('That save could not be undone: without it, the remaining tests fail. Nothing was changed.', ...result.lines);
      return 1;
    }
    git(root, ['add', '-A']);
    git(root, ['commit', '--no-verify', '-m', `Undo: ${subject}`, '-m', 'Scope: undo']);
    if (hasRemote(root)) await upload(root);
    say(`Undone: "${subject}".${ids.length ? ` ${ids.join(', ')} ${ids.length > 1 ? 'are' : 'is'} back to "not built yet".` : ''}`);
    return 0;
  }

  if (!dirty) {
    say('There is no unsaved work to undo. To undo the last save itself, run: vibe-rails undo --last-save');
    return 0;
  }
  // Keep a copy of what is thrown away, in case it was a mistake.
  git(root, ['add', '-A']);
  const tree = git(root, ['write-tree']).out;
  const backup = git(root, ['commit-tree', tree, '-p', 'HEAD', '-m', 'Backup before undo']).out;
  if (backup) git(root, ['update-ref', 'refs/vibe-rails/undo-backup', backup]);
  git(root, ['reset', '--hard', 'HEAD']);

  // Promises and interview answers are kept. A half-built promise lost its test, so it starts over.
  const restarted = [];
  for (const item of state.scope) {
    if (item.status === 'red') {
      item.status = 'planned';
      delete item.red;
      restarted.push(item.id);
    }
  }
  saveState(root, config, state);
  say(
    `Back to the last saved version ("${git(root, ['log', '-1', '--format=%s']).out}").`,
    `The promises are kept.${restarted.length ? ` ${restarted.join(', ')} will be built again from the start.` : ''} Run: vibe-rails next`,
  );
  return 0;
}

const SIGN_IN_AGAIN = 'the GitHub sign-in has run out, so nothing was sent online. Ask the user to sign in again: vibe-rails connect --auto';

// Sends the saved work to GitHub, renewing the sign-in first if it has run out.
// Returns { problem } (null when it worked) and { lapsed: true } when the user has to sign in again.
async function upload(root) {
  const { lapsed } = await github.renewSignIn();
  const push = git(root, ['push', '--no-verify', '-u', 'origin', 'HEAD'], { timeout: 60000 });
  return { problem: push.ok ? null : push.err.split('\n').pop(), lapsed: Boolean(lapsed) && !push.ok };
}

async function connectExisting(root, url) {
  git(root, ['remote', 'remove', 'origin']);
  git(root, ['remote', 'add', 'origin', url]);
  if (!git(root, ['ls-remote', 'origin'], { timeout: 20000 }).ok) {
    git(root, ['remote', 'remove', 'origin']);
    say('Could not reach that repository from this computer. Check the address, and that this computer is signed in to GitHub.');
    return 1;
  }
  const { problem } = await upload(root);
  say(problem ? `Connected, but the first upload failed: ${problem}` : 'Connected. The project is backed up on GitHub.');
  return problem ? 1 : 0;
}

// Run it, do what it says, run it again: each call moves the sign-in one step forward.
export async function connect({ args, flags }) {
  const { root, config, state } = open();
  // Online backup is the user's choice. Keeping the project on this computer only is fine.
  if (flags.local) {
    state.backup = 'local';
    saveState(root, config, state);
    say('Noted: this project stays on this computer only. If the user changes their mind later, run: vibe-rails connect');
    return 0;
  }
  if (args[0]) {
    const code = await connectExisting(root, args[0]);
    if (code !== 0) {
      say(
        'If the address is right, this computer is not signed in to GitHub yet.',
        github.clientId()
          ? 'The simplest fix is the automatic choice, which signs in from the browser: vibe-rails connect --auto'
          : 'The user can sign in with the GitHub Desktop app or the GitHub CLI (gh auth login), then try again.',
      );
    }
    return code;
  }

  const connected = hasRemote(root);
  if (connected) {
    const { problem, lapsed } = await upload(root);
    if (!problem) {
      say('Already connected. The project is backed up on GitHub.');
      return 0;
    }
    if (!lapsed) {
      say(`GitHub could not be reached: ${problem}`);
      return 1;
    }
    if (!flags.auto) {
      say(`The project is connected, but ${SIGN_IN_AGAIN}`);
      return 1;
    }
    // The sign-in ran out and cannot be renewed: carry on below to sign in again.
  }

  if (flags.manual) {
    say(
      'Tell the user these steps, in these words:',
      '  1. Open https://github.com in your browser and sign in. If you have no account, create a free one first.',
      '  2. Open https://github.com/new',
      `  3. Under "Repository name", type a name, for example: ${slugify(config.name)}`,
      '  4. Choose "Private", so only you can see it.',
      '  5. Leave everything else as it is. Do not tick "Add a README file".',
      '  6. Press the green "Create repository" button.',
      '  7. On the next page, copy the address in the box near the top. It ends in ".git". Paste it here.',
      'When they give you the address, run: vibe-rails connect <address>',
    );
    return 0;
  }

  if (!flags.auto) {
    const automatic = github.clientId()
      ? [
        '  3. Automatic. They type a short code on github.com and Vibe Rails creates a private repository in THEIR OWN account',
        '     and uploads the project. Be clear about the permission: GitHub will ask them to give Vibe Rails "full control of',
        '     private repositories", which covers all their repositories, because GitHub offers nothing narrower for this.',
        '     Vibe Rails only creates this one repository and uploads to it. The sign-in is kept on their computer and is not',
        '     sent to anyone. If they choose this: vibe-rails connect --auto',
      ]
      : [];
    say(
      `An online backup is optional. Offer the user these ${automatic.length ? 'three' : 'two'} choices in plain words and let them pick:`,
      '  1. Keep it on this computer only. Nothing goes online. Their work is still saved here after every step.',
      '     If they choose this: vibe-rails connect --local',
      '  2. They create the online repository themselves on GitHub and give you its address. Vibe Rails gets no access',
      '     to their GitHub account. For the steps to read to them: vibe-rails connect --manual',
      ...automatic,
    );
    return 0;
  }

  if (!github.clientId()) {
    say('The automatic choice is not available in this copy of Vibe Rails. For the steps to do it by hand: vibe-rails connect --manual');
    return 1;
  }
  if (!github.hasCredentialStorage()) {
    say(`This computer has nowhere safe to remember the GitHub sign-in. Run: git config --global credential.helper ${process.platform === 'darwin' ? 'osxkeychain' : 'cache'}   then try again.`);
    return 1;
  }

  const name = flags.name || slugify(config.name);
  const pendingFile = path.join(root, '.git', 'vibe-rails-github.json');
  const create = async (token) => {
    if (connected) {
      const { problem } = await upload(root);
      say(problem ? `Signed in again, but the upload failed: ${problem}` : 'Signed in again. The project is backed up on GitHub.');
      return problem ? 1 : 0;
    }
    const made = await github.createRepository(token, name);
    if (made.taken) {
      say(`The user already has a repository called "${name}" on GitHub. Ask them for another name, then run: vibe-rails connect --auto --name "<name>"`);
      return 1;
    }
    if (made.denied) return null;
    git(root, ['remote', 'add', 'origin', made.url]);
    const { problem } = await upload(root);
    say(problem ? `The repository was created (${made.page}), but the upload failed: ${problem}` : `Backed up on GitHub, visible only to the user: ${made.page}`);
    return problem ? 1 : 0;
  };

  // 1. Already signed in on this computer?
  if (!connected) await github.renewSignIn();
  const stored = connected ? null : github.storedToken();
  if (stored) {
    const code = await create(stored);
    if (code !== null) return code;
  }

  // 2. Did the user finish typing the code from last time?
  if (fs.existsSync(pendingFile)) {
    const pending = JSON.parse(fs.readFileSync(pendingFile, 'utf8'));
    if (pending.expiresAt > Date.now()) {
      const waitMs = Number(process.env.VIBE_RAILS_POLL_MS ?? 30000);
      const result = await github.pollForToken(pending, waitMs);
      if (result.pending) {
        say(`Still waiting for the user to type the code ${pending.userCode} at ${pending.url}. When they have, run: vibe-rails connect --auto`);
        return 0;
      }
      if (result.token) {
        fs.rmSync(pendingFile);
        const login = await github.getLogin(result.token);
        if (login) github.storeToken(login, result.token, result);
        const code = await create(result.token);
        if (code !== null) return code;
        say('GitHub signed the user in but would not create a repository. To retry: vibe-rails connect --auto');
        return 1;
      }
    }
    fs.rmSync(pendingFile, { force: true });
  }

  // 3. Start a new sign-in.
  const started = await github.startDeviceFlow();
  writeJson(pendingFile, started);
  say(
    'Tell the user, in these words:',
    `  1. Open ${started.url} in your browser. If you have no GitHub account yet, create a free one there first.`,
    `  2. Type this code: ${started.userCode}`,
    '  3. GitHub will ask to give Vibe Rails "full control of private repositories". That is the only way GitHub lets a tool',
    '     create a private repository for you. Vibe Rails will create one repository in your account and upload this project;',
    '     it does nothing else, and the sign-in stays on this computer.',
    '  4. If you are happy with that, press "Authorize", then tell me you are done. If not, tell me and we will pick another way.',
    'When they say done, run: vibe-rails connect --auto',
  );
  return 0;
}

// ---------- preview ----------

const TRY_HINT = "Open that address for the user: in the Claude app's own browser if you can, otherwise ask them to open it in theirs. Then tell them exactly what to click.";

// Starts the app in the background and returns at once with its address, so the AI is never left waiting on a server.
export async function preview({ args }) {
  const { root, config } = open();
  const tmp = path.join(root, DIR, 'tmp');
  const file = path.join(tmp, 'preview.json');
  const log = path.join(tmp, 'preview.log');
  const running = () => {
    try {
      const info = JSON.parse(fs.readFileSync(file, 'utf8'));
      process.kill(info.pid, 0);
      return info;
    } catch {
      return null;
    }
  };

  if (args[0] === 'stop') {
    const info = running();
    if (info) {
      try {
        process.kill(-info.pid);
      } catch { /* already gone */ }
    }
    fs.rmSync(file, { force: true });
    say(info ? 'The preview is stopped.' : 'The preview was not running.');
    return 0;
  }

  const already = running();
  if (already) {
    say(`The app is already running at ${already.url}`, TRY_HINT);
    return 0;
  }

  fs.mkdirSync(tmp, { recursive: true });
  const out = fs.openSync(log, 'w');
  const child = spawn(config.commands.dev, {
    cwd: root, shell: true, detached: true, stdio: ['ignore', out, out], env: { ...process.env, BROWSER: 'none' },
  });
  child.unref();

  const deadline = Date.now() + 30000;
  let url = null;
  while (!url && Date.now() < deadline && child.exitCode === null) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const text = fs.readFileSync(log, 'utf8').replace(/\x1b\[[0-9;]*m/g, '');
    url = /https?:\/\/(?:localhost|127\.0\.0\.1):\d+[^\s]*/.exec(text)?.[0] || null;
  }
  if (!url) {
    try {
      process.kill(-child.pid);
    } catch { /* already gone */ }
    say('The app did not start.', fs.readFileSync(log, 'utf8').trim().split('\n').slice(-8).join('\n'));
    return 1;
  }
  writeJson(file, { pid: child.pid, url });
  say(`The app is running at ${url}`, TRY_HINT);
  return 0;
}

// ---------- guidance ----------

export function statusLine(config, state) {
  const s = summary(state);
  return state.phase === 'interview'
    ? `Vibe Rails project "${config.name}" · planning (${TOPICS.length - missingTopics(state).length}/${TOPICS.length} topics, ${s.planned} promises)`
    : `Vibe Rails project "${config.name}" · building (${s.done} built, ${untried(state).length} of them not tried by the user, ${s.red} in progress, ${s.planned} not built yet)`;
}

export function status() {
  const { config, state } = open();
  say(statusLine(config, state));
  return 0;
}

// The single source of truth for "what now". Skills stay short because they defer to this.
export function next() {
  const { config, state } = open();
  const lines = [statusLine(config, state)];

  if (state.phase === 'interview') {
    const missing = missingTopics(state);
    if (missing.length) {
      lines.push('Cover these with the user, one at a time, in plain words. Record each when the user has confirmed your summary of it:');
      for (const t of missing) {
        lines.push(`- ${t.id} (${t.by === 'user' ? 'ask' : 'you write, user confirms'}): ${t.hint}`);
      }
      lines.push('Record with: vibe-rails brief set <topic> "<answer>"');
    } else if (!mockupApproved(open().root, state)) {
      lines.push(
        `Show before building. Write a mock-up as one self-contained file, ${MOCKUP}: every screen, clickable between screens,`,
        'made-up example data, the agreed look, nothing really saved. Then run: vibe-rails mockup show',
        'Change it until the user is happy. Only on a clear yes: vibe-rails mockup approve',
      );
    } else if (!state.scope.length) {
      lines.push(
        'Turn the answers into promises: one short plain sentence each, about something a person can see or do.',
        'Add each with: vibe-rails scope add "<promise>"   then run vibe-rails next',
      );
    } else {
      lines.push(
        'Read the promises back to the user (vibe-rails scope list) with the build plan, in plain words.',
        'Change anything they correct. Only when they clearly say yes, run: vibe-rails approve',
      );
    }
  } else {
    const live = (status) => state.scope.filter((i) => i.status === status);
    const [inProgress] = live('red');
    const [planned] = live('planned');
    const waiting = untried(state);
    const askToTry = () => lines.push(
      'Ask the user to try what was built. Start it with: vibe-rails preview   then tell them exactly what to click for each:',
      ...waiting.map((i) => `- ${i.id}: ${i.text}`),
      'For each one they say works: vibe-rails confirm <ids>. If one is not what they meant: vibe-rails scope add --bug "<what should happen instead>"',
    );
    if (inProgress) {
      lines.push(
        `Build ${inProgress.id}: ${inProgress.text}`,
        `Its test is proven. Write the code until it passes, then: vibe-rails save "<what changed>" --for ${inProgress.id}`,
      );
    } else if (waiting.length >= MAX_UNTRIED || (waiting.length && !planned)) {
      askToTry();
    } else if (planned) {
      lines.push(
        `Next is ${planned.id}: ${planned.text}`,
        `1. Write a test that checks it as a user would. Put [${planned.id}] in the test's name.`,
        `2. Prove it fails: vibe-rails red ${planned.id}`,
        `3. Write the code, then: vibe-rails save "<what changed>" --for ${planned.id}`,
      );
    } else {
      lines.push(
        'Everything agreed is built and checked.',
        'Let the user try it (vibe-rails preview) and ask what they think.',
        'New request: vibe-rails scope add "<promise>".  Something broken: vibe-rails scope add --bug "<what should happen instead>".',
      );
    }
    if (!hasRemote(open().root) && state.backup !== 'local') {
      lines.push(
        'Optional, ask once at a calm moment: would the user like an online backup of the project? It is their choice.',
        'Run vibe-rails connect to get the choices to offer them (keep it local, do it themselves, or automatic). This reminder stops once they choose.',
      );
    }
  }
  say(...lines);
  return 0;
}
