// Signing in to GitHub and creating the backup repository, without the user touching a terminal.
// Uses GitHub's "device flow": the user types a short code on github.com in their browser.
// The sign-in is handed to git's own credential storage; this tool never writes it to a file.
import { spawnSync } from 'node:child_process';

// The public id of the Vibe Rails GitHub OAuth app (not a secret). Empty until the project
// owner registers one; see docs/GITHUB_APP.md. Without it, `connect` falls back to manual steps.
const BUILT_IN_CLIENT_ID = '';

export const clientId = () => process.env.VIBE_RAILS_GITHUB_CLIENT_ID || BUILT_IN_CLIENT_ID;
const web = () => process.env.VIBE_RAILS_GITHUB_WEB || 'https://github.com';
const api = () => process.env.VIBE_RAILS_GITHUB_API || 'https://api.github.com';

async function post(url, body, token) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'vibe-rails',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  let json = {};
  try {
    json = await response.json();
  } catch { /* an empty or non-JSON body is treated as {} */ }
  return { status: response.status, json };
}

export async function startDeviceFlow() {
  const { status, json } = await post(`${web()}/login/device/code`, { client_id: clientId(), scope: 'repo' });
  if (status !== 200 || !json.device_code) throw new Error(`GitHub did not start the sign-in (${status}).`);
  return {
    deviceCode: json.device_code,
    userCode: json.user_code,
    url: json.verification_uri,
    interval: json.interval || 5,
    expiresAt: Date.now() + (json.expires_in || 900) * 1000,
  };
}

// Returns { token } | { pending: true } | { failed: 'expired_token' | 'access_denied' | ... }
export async function pollForToken(pending, waitMs) {
  const deadline = Date.now() + waitMs;
  let interval = pending.interval;
  for (;;) {
    const { json } = await post(`${web()}/login/oauth/access_token`, {
      client_id: clientId(),
      device_code: pending.deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    });
    if (json.access_token) return { token: json.access_token };
    if (json.error === 'slow_down') interval += 5;
    else if (json.error !== 'authorization_pending') return { failed: json.error || 'unknown' };
    if (Date.now() + interval * 1000 > deadline) return { pending: true };
    await new Promise((resolve) => setTimeout(resolve, interval * 1000));
  }
}

export async function getLogin(token) {
  const response = await fetch(`${api()}/user`, {
    headers: { Accept: 'application/json', 'User-Agent': 'vibe-rails', Authorization: `Bearer ${token}` },
  });
  return response.status === 200 ? (await response.json()).login : null;
}

// Returns { url, page } | { taken: true } | { denied: true }
export async function createRepository(token, name) {
  const { status, json } = await post(`${api()}/user/repos`, { name, private: true }, token);
  if (status === 201) return { url: json.clone_url, page: json.html_url };
  if (status === 422) return { taken: true };
  return { denied: true };
}

// ---------- git's credential storage ----------

function credentialInput(extra = {}) {
  const { protocol, host } = new URL(web());
  const fields = { protocol: protocol.replace(':', ''), host, ...extra };
  return Object.entries(fields).map(([k, v]) => `${k}=${v}`).join('\n') + '\n\n';
}

function credential(action, input) {
  return spawnSync('git', ['credential', action], {
    input,
    encoding: 'utf8',
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_ASKPASS: '', SSH_ASKPASS: '' },
  });
}

export function hasCredentialStorage() {
  return Boolean(spawnSync('git', ['config', 'credential.helper'], { encoding: 'utf8' }).stdout.trim());
}

export function storedToken() {
  const result = credential('fill', credentialInput());
  if (result.status !== 0) return null;
  return /^password=(.+)$/m.exec(result.stdout)?.[1] || null;
}

export function storeToken(login, token) {
  credential('approve', credentialInput({ username: login, password: token }));
}
