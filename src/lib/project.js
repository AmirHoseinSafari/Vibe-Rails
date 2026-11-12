// Where a Vibe Rails project keeps its state, and the only code allowed to change it.
import fs from 'node:fs';
import path from 'node:path';
import { renderProject, renderScope } from './render.js';

export const DIR = '.vibe-rails';

// The interview. `by: 'user'` topics are asked in plain language;
// `by: 'assistant'` topics are written by the AI and confirmed by the user.
export const TOPICS = [
  { id: 'purpose', title: 'What it is for', by: 'user', hint: 'the problem it solves, in one or two sentences' },
  { id: 'users', title: 'Who uses it', by: 'user', hint: 'who they are and where they use it (phone, laptop)' },
  { id: 'tasks', title: 'What people do with it', by: 'user', hint: 'each main thing a person can do, step by step' },
  { id: 'screens', title: 'What it looks like', by: 'user', hint: 'each screen and what is on it; confirm a described sketch' },
  { id: 'data', title: 'What it remembers', by: 'user', hint: 'what information is kept, and whether it must survive closing the app' },
  { id: 'look', title: 'Look and feel', by: 'user', hint: 'mood, colours, an app they like the look of' },
  { id: 'not_included', title: 'What is left out', by: 'user', hint: 'things that sound related but are not in the first version' },
  { id: 'done_when', title: 'How we know it is finished', by: 'user', hint: 'what the user will try to decide it works' },
  { id: 'plan', title: 'How it will be built', by: 'assistant', hint: 'your build plan in plain words, no jargon; the user confirms it' },
];

export class UserError extends Error {}

// How many built promises may wait for the user to try them before new ones are blocked.
export const MAX_UNTRIED = 3;

export function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'app';
}

export function untried(state) {
  return state.scope.filter((i) => i.status === 'done' && !i.confirmed);
}

export function findRoot(start = process.cwd()) {
  let dir = path.resolve(start);
  for (;;) {
    if (fs.existsSync(path.join(dir, DIR, 'config.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export function requireRoot(start) {
  const root = findRoot(start);
  if (!root) {
    throw new UserError('This folder is not a Vibe Rails project. Start one with: vibe-rails init <folder> --name "<name>"');
  }
  return root;
}

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

export function load(root) {
  return {
    config: readJson(path.join(root, DIR, 'config.json')),
    state: readJson(path.join(root, DIR, 'state.json')),
  };
}

export function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}

// Every state change goes through here, so the readable files never drift from the data.
export function saveState(root, config, state) {
  writeJson(path.join(root, DIR, 'state.json'), state);
  fs.writeFileSync(path.join(root, 'PROJECT.md'), renderProject(config, state));
  fs.writeFileSync(path.join(root, 'SCOPE.md'), renderScope(config, state));
}

export function newState() {
  return { phase: 'interview', brief: {}, nextId: 1, scope: [] };
}

export function today() {
  return (process.env.VIBE_RAILS_NOW || new Date().toISOString()).slice(0, 10);
}

export function missingTopics(state) {
  return TOPICS.filter((t) => !state.brief[t.id]);
}

export function findItem(state, id) {
  const wanted = String(id).toUpperCase();
  const item = state.scope.find((i) => i.id === wanted);
  if (!item) throw new UserError(`There is no scope item ${wanted}. See them with: vibe-rails scope list`);
  return item;
}

export function summary(state) {
  const count = (status) => state.scope.filter((i) => i.status === status).length;
  return { done: count('done'), red: count('red'), planned: count('planned'), dropped: count('dropped') };
}
