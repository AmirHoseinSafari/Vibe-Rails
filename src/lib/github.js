// Signing in to GitHub and creating the backup repository, without the user touching a terminal.
// Uses GitHub's "device flow": the user types a short code on github.com in their browser.
// The sign-in is handed to git's own credential storage; this tool never writes it to a file.
import { spawnSync } from 'node:child_process';

// The public id of the Vibe Rails GitHub OAuth app (not a secret); see docs/GITHUB_APP.md.
// Without one, `connect` offers only the choices that need no sign-in.
const BUILT_IN_CLIENT_ID = 'Ov23lic6TI4gohIl548k';

// Setting the variable to an empty value switches the built-in app off (the tests do this).
export const clientId = () => process.env.VIBE_RAILS_GITHUB_CLIENT_ID ?? BUILT_IN_CLIENT_ID;
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

// Returns { token, refreshToken?, expiresIn? } | { pending: true } | { failed: 'expired_token' | 'access_denied' | ... }
export async function pollForToken(pending, waitMs) {
  const deadline = Date.now() + waitMs;
  let interval = pending.interval;
  for (;;) {
    const { json } = await post(`${web()}/login/oauth/access_token`, {
      client_id: clientId(),
      device_code: pending.deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    });
    if (json.access_token) return grant(json);
    if (json.error === 'slow_down') interval += 5;
    else if (json.error !== 'authorization_pending') return { failed: json.error || 'unknown' };
    if (Date.now() + interval * 1000 > deadline) return { pending: true };
    await new Promise((resolve) => setTimeout(resolve, interval * 1000));
  }
}

const grant = (json) => ({ token: json.access_token, refreshToken: json.refresh_token, expiresIn: json.expires_in });

// A sign-in from an app set to expire lasts eight hours and comes with a renewal token. Call this before
// anything that needs the sign-in: it swaps a sign-in that has run out, or is about to, for a new one.
// Returns { lapsed: true } when GitHub will not renew it, so the user has to sign in again.
export async function renewSignIn() {
  if (!clientId()) return {};
  const renewal = storedRenewal();
  if (!renewal || renewal.expiresAt - Date.now() > 5 * 60 * 1000) return {};
  let json;
  try {
    ({ json } = await post(`${web()}/login/oauth/access_token`, {
      client_id: clientId(),
      grant_type: 'refresh_token',
      refresh_token: renewal.refreshToken,
    }));
  } catch {
    return {}; // offline: the upload itself will say so
  }
  if (!json.access_token) return { lapsed: true };
  storeToken(renewal.login, json.access_token, grant(json));
  return { renewed: true };
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

// The renewal token is kept in the same safe place as the sign-in, under a made-up host name
// that git never contacts, with the time the sign-in runs out in front of it.
function hosts() {
  const { protocol, host } = new URL(web());
  return {
    signIn: { protocol: protocol.replace(':', ''), host },
    renewal: { protocol: 'https', host: `${host.replace(/[^a-z0-9.-]/gi, '-')}.vibe-rails.invalid` },
  };
}

const credentialInput = (fields) => Object.entries(fields).map(([k, v]) => `${k}=${v}`).join('\n') + '\n\n';

function credential(action, fields) {
  return spawnSync('git', ['credential', action], {
    input: credentialInput(fields),
    encoding: 'utf8',
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_ASKPASS: '', SSH_ASKPASS: '' },
  });
}

function read(where) {
  const result = credential('fill', where);
  if (result.status !== 0) return null;
  const password = /^password=(.+)$/m.exec(result.stdout)?.[1];
  return password ? { username: /^username=(.+)$/m.exec(result.stdout)?.[1], password } : null;
}

export function hasCredentialStorage() {
  return Boolean(spawnSync('git', ['config', 'credential.helper'], { encoding: 'utf8' }).stdout.trim());
}

export function storedToken() {
  return read(hosts().signIn)?.password || null;
}

function storedRenewal() {
  const found = read(hosts().renewal);
  const parts = /^(\d+):(.+)$/.exec(found?.password || '');
  return parts ? { login: found.username, expiresAt: Number(parts[1]), refreshToken: parts[2] } : null;
}

export function storeToken(login, token, { refreshToken, expiresIn } = {}) {
  const { signIn, renewal } = hosts();
  credential('approve', { ...signIn, username: login, password: token });
  if (refreshToken) {
    const expiresAt = Date.now() + (expiresIn ?? 28800) * 1000;
    credential('approve', { ...renewal, username: login, password: `${expiresAt}:${refreshToken}` });
  } else if (storedRenewal()) {
    credential('reject', { ...renewal, username: login });
  }
}
