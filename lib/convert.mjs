// f(chat_data, options) -> session transcript, optionally stored where /resume finds it.

import { randomUUID } from 'node:crypto';
import { normalize, selectPairs } from './normalize.mjs';
import { BUILTIN, compile, redactMessages } from './redact.mjs';
import {
  buildEntries, detectCcVersion, detectGitBranch, sessionPath, serialize, writeSession,
} from './session.mjs';

export function convert(chatData, options = {}) {
  const {
    cwd = process.cwd(),
    pairs = 'all',
    keepThinking = false,
    imagePlaceholder = true,
    redactions = [],
    builtinRedactions = false,
    redactWith,
    sessionId = randomUUID(),
    title,
    ccVersion,
    gitBranch,
  } = options;

  const { conversation, messages: all } = normalize(chatData, { keepThinking, imagePlaceholder });
  const selected = selectPairs(all, pairs);
  const rules = compile([...(builtinRedactions ? BUILTIN : []), ...redactions]);
  const { messages, count } = redactMessages(selected, rules, redactWith);

  const entries = buildEntries(messages, {
    sessionId,
    cwd,
    title: title || conversation.name,
    model: conversation.model,
    ccVersion: ccVersion || detectCcVersion(),
    gitBranch: gitBranch || detectGitBranch(cwd),
  });

  return {
    sessionId,
    conversation,
    messages,
    entries,
    jsonl: serialize(entries),
    redactionCount: count,
    path: sessionPath(cwd, sessionId),
    counts: {
      total: all.length,
      kept: messages.length,
      prompts: messages.filter((m) => m.role === 'user').length,
    },
  };
}

export function putAsSession(chatData, options = {}) {
  const result = convert(chatData, options);
  const path = options.out || result.path;
  writeSession(result.entries, { path, force: options.force });
  return { ...result, path };
}
