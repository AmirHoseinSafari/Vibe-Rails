// Turns the project state into the two files a non-technical person reads.
import { TOPICS } from './project.js';

const NOTE = '<!-- Written by Vibe Rails. Do not edit by hand; it is rebuilt on every change. -->';

export function renderProject(config, state) {
  const lines = [NOTE, `# ${config.name}`, ''];
  for (const topic of TOPICS) {
    lines.push(`## ${topic.title}`, '', state.brief[topic.id] || '_Not answered yet._', '');
  }
  lines.push(state.phase === 'build' ? '_This plan was approved; building has started._' : '_This plan is not approved yet._', '');
  return lines.join('\n');
}

function statusText(item) {
  if (item.status === 'done') return item.confirmed ? 'Built, checked, and tried by you' : 'Built and checked; waiting for you to try it';
  return item.status === 'red' ? 'Being built' : 'Not built yet';
}

export function renderScope(config, state) {
  const lines = [
    NOTE,
    `# What ${config.name} must do`,
    '',
    'Every line below is a promise. Each one has an automatic check that runs before any work is saved.',
    '',
  ];
  const live = state.scope.filter((i) => i.status !== 'dropped');
  if (!live.length) lines.push('_Nothing agreed yet._', '');
  for (const item of live) {
    const kind = item.type === 'bug' ? ' (fix)' : '';
    const flag = item.red?.mode === 'already-works' ? ' Already worked when its check was added.' : '';
    lines.push(`- **${item.id}**${kind} ${item.text} — _${statusText(item)}._${flag}`);
  }
  const dropped = state.scope.filter((i) => i.status === 'dropped');
  if (dropped.length) {
    lines.push('', '## Removed', '');
    for (const item of dropped) lines.push(`- ${item.id} ${item.text} — ${item.dropReason}`);
  }
  lines.push('');
  return lines.join('\n');
}
