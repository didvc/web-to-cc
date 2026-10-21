// Build and store a Claude Code session transcript (.jsonl) from normalized messages.

import { execFileSync } from 'node:child_process';
import { randomUUID, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const FALLBACK_CC_VERSION = '2.1.305';

export const encodeProjectDir = (cwd) => resolve(cwd).replace(/[^a-zA-Z0-9]/g, '-');

export function configDir() {
  return process.env.CLAUDE_CONFIG_DIR || join(process.env.HOME || homedir(), '.claude');
}

export function sessionPath(cwd, sessionId) {
  return join(configDir(), 'projects', encodeProjectDir(cwd), `${sessionId}.jsonl`);
}

export function detectCcVersion() {
  try {
    const out = execFileSync('claude', ['--version'], { encoding: 'utf8', timeout: 20000 });
    return (out.match(/\d+\.\d+\.\d+/) || [FALLBACK_CC_VERSION])[0];
  } catch {
    return FALLBACK_CC_VERSION;
  }
}

export function detectGitBranch(cwd) {
  try {
    return execFileSync('git', ['-C', cwd, 'rev-parse', '--abbrev-ref', 'HEAD'], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim() || 'HEAD';
  } catch {
    return 'HEAD';
  }
}

const apiId = (prefix) => `${prefix}_${randomBytes(12).toString('hex')}`;

const USAGE = {
  input_tokens: 0,
  cache_creation_input_tokens: 0,
  cache_read_input_tokens: 0,
  output_tokens: 0,
  service_tier: 'standard',
};

export function buildEntries(messages, opts = {}) {
  const {
    sessionId = randomUUID(),
    cwd = process.cwd(),
    ccVersion = FALLBACK_CC_VERSION,
    gitBranch = 'HEAD',
    model = 'claude-opus-5-5',
    title,
  } = opts;

  const common = { userType: 'external', entrypoint: 'cli', cwd: resolve(cwd), sessionId, version: ccVersion, gitBranch };
  const entries = [{ type: 'mode', mode: 'normal', sessionId }];
  let parentUuid = null;
  let promptIndex = 0;
  let lastPrompt = '';

  for (const m of messages) {
    const uuid = randomUUID();
    const timestamp = isoOr(m.createdAt);
    if (m.role === 'user') {
      promptIndex++;
      lastPrompt = m.text;
      entries.push({
        parentUuid,
        isSidechain: false,
        promptId: randomUUID(),
        type: 'user',
        message: { role: 'user', content: m.text },
        uuid,
        timestamp,
        origin: { kind: 'human' },
        promptSource: 'typed',
        turnOrigin: 'human',
        turnPosition: { promptIndex, turnIndex: promptIndex },
        ...common,
      });
    } else {
      entries.push({
        parentUuid,
        isSidechain: false,
        message: {
          model: m.model || model,
          id: apiId('msg'),
          type: 'message',
          role: 'assistant',
          content: [{ type: 'text', text: m.text }],
          stop_reason: 'end_turn',
          stop_sequence: null,
          usage: USAGE,
        },
        requestId: apiId('req'),
        type: 'assistant',
        uuid,
        timestamp,
        ...common,
      });
    }
    parentUuid = uuid;
  }

  if (!parentUuid) throw new Error('no messages to convert');
  entries.push({ type: 'last-prompt', lastPrompt, leafUuid: parentUuid, sessionId });
  if (title) entries.push({ type: 'ai-title', aiTitle: title, sessionId });
  return entries;
}

const isoOr = (v) => {
  const t = v ? Date.parse(v) : NaN;
  return new Date(Number.isNaN(t) ? Date.now() : t).toISOString();
};

export const serialize = (entries) => entries.map((e) => JSON.stringify(e)).join('\n') + '\n';

export function writeSession(entries, { path, force = false }) {
  if (existsSync(path) && !force) throw new Error(`refusing to overwrite ${path} (use --force)`);
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, serialize(entries), { mode: 0o600 });
  return path;
}
