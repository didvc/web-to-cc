#!/usr/bin/env node
// Convert exported claude.ai chat data into a resumable Claude Code session.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { convert, putAsSession } from './lib/convert.mjs';

const USAGE = `usage: web-to-cc [--in FILE|-] [options]

  --in FILE          exported chat JSON (default: stdin)
  --cwd DIR          project directory the session belongs to (default: .)
  --pairs SPEC       all | first:N | last:N (default: all)
  --keep-thinking    keep assistant thinking blocks as text
  --no-image-note    drop "[image omitted: ...]" placeholders
  --redact PAT       word or /regex/flags to mask; repeatable
  --redact-file F    one pattern per line, # comments allowed
  --redact-builtins  also mask emails, IPv4, api keys/tokens
  --redact-with STR  replacement text (default: [REDACTED])
  --session-id UUID  session id to write as (default: random)
  --title STR        session title (default: conversation name)
  --cc-version V     Claude Code version to stamp (default: detected)
  --out FILE         write the jsonl here instead of the session store
  --stdout           print the jsonl, store nothing
  --dry-run          report what would be written
  --force            overwrite an existing session file
  -q, --quiet        no summary on success
  -h, --help         this text
`;

function parseArgs(argv) {
  const o = { redactions: [], imagePlaceholder: true };
  const need = (name, v) => { if (v === undefined) { throw new Error(`${name} needs a value`); } return v; };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => need(a, argv[++i]);
    if (a === '--in') o.in = next();
    else if (a === '--cwd') o.cwd = next();
    else if (a === '--pairs') o.pairs = next();
    else if (a === '--keep-thinking') o.keepThinking = true;
    else if (a === '--no-image-note') o.imagePlaceholder = false;
    else if (a === '--redact') o.redactions.push(next());
    else if (a === '--redact-file') o.redactions.push(...readFileSync(next(), 'utf8').split(/\r?\n/));
    else if (a === '--redact-builtins') o.builtinRedactions = true;
    else if (a === '--redact-with') o.redactWith = next();
    else if (a === '--session-id') o.sessionId = next();
    else if (a === '--title') o.title = next();
    else if (a === '--cc-version') o.ccVersion = next();
    else if (a === '--out') o.out = resolve(next());
    else if (a === '--stdout') o.stdout = true;
    else if (a === '--dry-run') o.dryRun = true;
    else if (a === '--force') o.force = true;
    else if (a === '-q' || a === '--quiet') o.quiet = true;
    else if (a === '-h' || a === '--help') o.help = true;
    else if (!o.in && !a.startsWith('-')) o.in = a;
    else throw new Error(`unknown argument: ${a}`);
  }
  return o;
}

const readStdin = () => new Promise((res, rej) => {
  let s = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (d) => { s += d; }).on('end', () => res(s)).on('error', rej);
});

async function main(argv) {
  const opts = parseArgs(argv);
  if (opts.help) { process.stdout.write(USAGE); return; }

  const raw = !opts.in || opts.in === '-' ? await readStdin() : readFileSync(opts.in, 'utf8');
  if (!raw.trim()) throw new Error('no chat data on stdin (pass --in FILE or pipe the export)');
  const data = JSON.parse(raw);

  const result = opts.dryRun || opts.stdout ? convert(data, opts) : putAsSession(data, opts);
  if (opts.stdout) { process.stdout.write(result.jsonl); return; }

  const where = opts.out || result.path;
  if (opts.quiet) return;
  const lines = [
    `${opts.dryRun ? 'would write' : 'wrote'} ${where}`,
    `  session   ${result.sessionId}`,
    `  title     ${result.conversation.name || opts.title || '(none)'}`,
    `  messages  ${result.counts.kept}/${result.counts.total} (${result.counts.prompts} prompts)`,
    `  redacted  ${result.redactionCount}`,
  ];
  if (!opts.out) lines.push(`  resume    cd ${resolve(opts.cwd || '.')} && claude --resume ${result.sessionId}`);
  process.stderr.write(lines.join('\n') + '\n');
}

main(process.argv.slice(2)).catch((e) => {
  process.stderr.write(`web-to-cc: ${e.message}\n`);
  process.exit(1);
});
