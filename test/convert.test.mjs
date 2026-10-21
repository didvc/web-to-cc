import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { convert, putAsSession } from '../lib/convert.mjs';
import { normalize, selectPairs } from '../lib/normalize.mjs';
import { compile, redact } from '../lib/redact.mjs';
import { encodeProjectDir, sessionPath } from '../lib/session.mjs';

const raw = JSON.parse(readFileSync(new URL('./fixtures/raw-conversation.json', import.meta.url), 'utf8'));
const base = { cwd: '/home/tmp/demo', ccVersion: '2.1.305', gitBranch: 'HEAD' };

test('normalizes the claude.ai conversation shape', () => {
  const { conversation, messages } = normalize(raw);
  assert.equal(conversation.name, 'Widget pipeline notes');
  assert.deepEqual(messages.map((m) => m.role), ['user', 'assistant', 'user', 'assistant']);
  assert.match(messages[2].text, /\[image omitted: graph\.png\]/);
  assert.doesNotMatch(messages[1].text, /weighing queue options/);
});

test('keeps thinking only when asked', () => {
  const { messages } = normalize(raw, { keepThinking: true });
  assert.match(messages[1].text, /weighing queue options/);
});

test('drops image notes when asked', () => {
  const { messages } = normalize(raw, { imagePlaceholder: false });
  assert.equal(messages[2].text, 'here is the current graph');
});

test('selects pairs from either end', () => {
  const { messages } = normalize(raw);
  assert.equal(selectPairs(messages, 'first:1').length, 2);
  assert.match(selectPairs(messages, 'last:1')[0].text, /current graph/);
  assert.equal(selectPairs(messages, 'all').length, 4);
  assert.throws(() => selectPairs(messages, 'middle:1'), /bad --pairs/);
});

test('redacts words, regexes and builtins', () => {
  const rules = compile(['Widget', '/stage \\d/i', '# comment']);
  const r = redact('Widget at stage 3', rules);
  assert.equal(r.text, '[REDACTED] at [REDACTED]');
  assert.equal(r.count, 2);
  const out = convert(raw, { ...base, builtinRedactions: true });
  assert.doesNotMatch(out.jsonl, /dev@example\.org/);
  assert.ok(out.redactionCount >= 1);
});

test('builds a chained, resumable transcript', () => {
  const { entries, sessionId, counts } = convert(raw, base);
  assert.deepEqual(counts, { total: 4, kept: 4, prompts: 2 });
  const msgs = entries.filter((e) => e.type === 'user' || e.type === 'assistant');
  assert.equal(msgs[0].parentUuid, null);
  for (let i = 1; i < msgs.length; i++) assert.equal(msgs[i].parentUuid, msgs[i - 1].uuid);
  for (const e of msgs) {
    assert.equal(e.sessionId, sessionId);
    assert.equal(e.cwd, '/home/tmp/demo');
    assert.equal(e.version, '2.1.305');
    assert.ok(Date.parse(e.timestamp));
  }
  assert.equal(entries.at(0).type, 'mode');
  const last = entries.find((e) => e.type === 'last-prompt');
  assert.equal(last.leafUuid, msgs.at(-1).uuid);
  assert.equal(entries.at(-1).aiTitle, 'Widget pipeline notes');
  assert.equal(entries.filter((e) => e.type === 'user')[0].message.content, msgs[0].message.content);
});

test('round-trips its own envelope', () => {
  const first = convert(raw, base);
  const envelope = {
    source: 'claude-web',
    conversation: first.conversation,
    messages: first.messages,
  };
  const second = convert(envelope, base);
  assert.deepEqual(second.messages.map((m) => m.text), first.messages.map((m) => m.text));
});

test('stores where /resume looks', () => {
  const home = mkdtempSync(join(tmpdir(), 'w2cc-'));
  const prev = process.env.CLAUDE_CONFIG_DIR;
  process.env.CLAUDE_CONFIG_DIR = join(home, '.claude');
  try {
    assert.equal(encodeProjectDir('/home/tmp/mono/web-to-cc'), '-home-tmp-mono-web-to-cc');
    const r = putAsSession(raw, { ...base, cwd: home });
    assert.equal(r.path, sessionPath(home, r.sessionId));
    const lines = readFileSync(r.path, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
    assert.equal(lines.length, r.entries.length);
    assert.throws(() => putAsSession(raw, { ...base, cwd: home, sessionId: r.sessionId }), /--force/);
  } finally {
    if (prev === undefined) delete process.env.CLAUDE_CONFIG_DIR;
    else process.env.CLAUDE_CONFIG_DIR = prev;
  }
});

test('rejects data it cannot read', () => {
  assert.throws(() => convert({ nope: 1 }, base), /unrecognized chat data/);
  assert.throws(() => convert({ chat_messages: [] }, base), /no messages/);
});
