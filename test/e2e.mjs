// Live end-to-end: userscript on the open claude.ai tab -> CLI -> a session a real
// Claude Code REPL resumes. Needs Chrome with --remote-debugging-port and tmux.
// E2E_SEND=1 also sends one tiny prompt to the resumed session (costs tokens).
// E2E_KEEP=1 leaves the tmux session and .e2e scratch in place.

import { execFileSync, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sessionPath } from '../lib/session.mjs';
import { attach } from './cdp.mjs';

const PORT = Number(process.env.CDP_PORT || 9555);
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const WORK = join(ROOT, '.e2e');
const PROJ = join(WORK, 'proj');
const EXPORT = join(WORK, 'export.json');
const CLI = join(ROOT, 'web-to-cc.mjs');
const TMUX = `w2cc-e2e-${process.pid}`;

const log = (s) => process.stdout.write(`${s}\n`);
const step = (s) => log(`\n== ${s}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tmux = (...args) => execFileSync('tmux', args, { encoding: 'utf8' });
const pane = () => tmux('capture-pane', '-p', '-t', TMUX);

async function waitFor(needle, timeoutMs, what) {
  const deadline = Date.now() + timeoutMs;
  const hit = (p) => (needle instanceof RegExp ? needle.test(p) : p.includes(needle));
  while (Date.now() < deadline) {
    if (hit(pane())) return;
    await sleep(500);
  }
  throw new Error(`timed out waiting for ${what} (${needle})\n--- pane ---\n${pane()}`);
}

const STOP = new Set(['image', 'omitted', 'unnamed', 'tool', 'REDACTED']);
function pickWord(messages) {
  const words = (messages.map((m) => m.text).join(' ').match(/[A-Za-z]{4,16}/g) || []).filter((w) => !STOP.has(w));
  const freq = new Map();
  for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);
  return [...freq].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length).map(([w]) => w)[0] || 'the';
}

const cleanup = [];
let page;

try {
  step('unit tests');
  const unit = spawnSync('node', ['--test', 'test/*.test.mjs'], { encoding: 'utf8', cwd: ROOT });
  if (unit.status !== 0) throw new Error(`unit tests failed:\n${unit.stdout}`);
  log(unit.stdout.trim().split('\n').filter((l) => /^(ℹ (tests|pass|fail)|✖)/.test(l)).join('  '));

  step('userscript on the open claude.ai tab');
  page = await attach(/claude\.ai\/(chat|project)\//, PORT);
  cleanup.push(() => page.close());
  log(`tab: ${page.url}`);
  await page.eval(readFileSync(join(ROOT, 'web-to-cc.user.js'), 'utf8'));

  // settings panel round-trip, then take it back off the page
  const saved = await page.eval(`(() => {
    const before = JSON.stringify(window.webToCc.config.get());
    window.webToCc.settings();
    const r = document.getElementById('web-to-cc-ui').shadowRoot;
    r.querySelector('#pairs').value = 'last:2';
    r.querySelector('#redactions').value = 'Acme Corp';
    r.querySelector('#save').click();
    const after = window.webToCc.config.get();
    document.getElementById('web-to-cc-ui').remove();
    return JSON.stringify({ before, pairs: after.pairs, redactions: after.redactions });
  })()`).then(JSON.parse);
  if (saved.pairs !== 'last:2' || saved.redactions !== 'Acme Corp') throw new Error('settings panel did not persist');
  log(`settings panel saves (pairs=${saved.pairs}, redactions=${JSON.stringify(saved.redactions)})`);
  cleanup.push(() => page.eval(`window.webToCc.config.set(JSON.parse(${JSON.stringify(saved.before)}))`));

  const payload = await page.eval(`(async () => JSON.stringify(await window.webToCc.build({ pairs: 'all' })))()`)
    .then(JSON.parse);
  mkdirSync(PROJ, { recursive: true });
  cleanup.push(() => rmSync(WORK, { recursive: true, force: true }));
  writeFileSync(EXPORT, JSON.stringify(payload, null, 1));
  log(`${payload.messages.length} messages from "${payload.conversation.name}" -> ${EXPORT}`);
  if (payload.messages.length < 2) throw new Error('chat has no prompt/response pair to convert');

  step('convert the last pair into a session');
  const secret = pickWord(payload.messages.slice(-2));
  const id = randomUUID();
  const run = spawnSync('node', [CLI, '--in', EXPORT, '--cwd', PROJ, '--session-id', id,
    '--pairs', 'last:1', '--redact', secret, '--redact-builtins'], { encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`cli failed: ${run.stderr.trim()}`);
  log(run.stderr.trim());
  const path = sessionPath(PROJ, id);
  cleanup.push(() => { rmSync(path, { force: true }); rmSync(dirname(path), { recursive: true, force: true }); });

  const text = readFileSync(path, 'utf8');
  const lines = text.trim().split('\n').map((l) => JSON.parse(l));
  const msgs = lines.filter((e) => e.type === 'user' || e.type === 'assistant');
  if (msgs.length !== 2) throw new Error(`expected one pair in the transcript, got ${msgs.length}`);
  if (msgs[0].parentUuid !== null || msgs[1].parentUuid !== msgs[0].uuid) throw new Error('transcript is not chained');
  if (text.includes(secret)) throw new Error(`redaction missed ${secret}`);
  log(`transcript ok: ${lines.length} lines, redacted ${JSON.stringify(secret)}`);

  step('find it in the /resume picker');
  tmux('new-session', '-d', '-s', TMUX, '-x', '150', '-y', '42', '-c', PROJ, 'claude');
  // let the REPL finish flushing its own writes before the session file goes away
  cleanup.push(async () => { try { tmux('kill-session', '-t', TMUX); } catch {} await sleep(1500); });
  await waitFor('Claude Code v', 60000, 'the REPL to start');
  tmux('send-keys', '-t', TMUX, '/resume');
  await sleep(1500);
  tmux('send-keys', '-t', TMUX, 'Enter');
  await waitFor('Resume session', 30000, 'the resume picker');
  const titleWord = (payload.conversation.name || '').split(/\s+/)[0];
  await waitFor(titleWord, 15000, 'the imported session in the picker');
  log(`picker lists "${titleWord}..."`);
  tmux('send-keys', '-t', TMUX, 'Escape');
  await sleep(500);
  tmux('kill-session', '-t', TMUX);

  step('resume it in a real Claude Code REPL');
  tmux('new-session', '-d', '-s', TMUX, '-x', '150', '-y', '42', '-c', PROJ, `claude --resume ${id}`);
  await waitFor('[REDACTED]', 60000, 'the imported transcript to render');
  log('transcript rendered in the resumed session');

  if (process.env.E2E_SEND === '1') {
    step('continue the imported conversation against the API');
    tmux('send-keys', '-t', TMUX, 'reply with the single word OK, no tools');
    await sleep(800);
    tmux('send-keys', '-t', TMUX, 'Enter');
    await waitFor(/done \d\d:\d\d/, 90000, 'a reply');
    log(pane().split('\n').filter((l) => l.trim()).slice(-3).join('\n'));
  }

  log('\ne2e ok');
} catch (e) {
  process.exitCode = 1;
  log(`\ne2e failed: ${e.message}`);
} finally {
  if (process.env.E2E_KEEP === '1') log(`\nE2E_KEEP=1: left ${TMUX} and ${WORK} in place`);
  else for (const fn of cleanup.reverse()) { try { await fn(); } catch {} }
}
