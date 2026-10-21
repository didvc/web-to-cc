// Pre-redaction: plain substrings or /regex/flags, applied to message text.

export const BUILTIN = [
  String.raw`/[\w.+-]+@[\w-]+\.[\w.]{2,}/g`,
  String.raw`/\b(?:\d{1,3}\.){3}\d{1,3}\b/g`,
  String.raw`/\b(?:sk|pk|ghp|gho|xox[abps])-[A-Za-z0-9_-]{16,}\b/g`,
  String.raw`/\b[A-Za-z0-9_-]*(?:api|secret|token|passwd|password)[A-Za-z0-9_-]*\s*[:=]\s*\S+/gi`,
];

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function compile(patterns) {
  return (patterns || []).map((raw) => {
    const p = String(raw).trim();
    if (!p || p.startsWith('#')) return null;
    const m = p.match(/^\/(.*)\/([gimsuy]*)$/);
    const re = m ? new RegExp(m[1], m[2].includes('g') ? m[2] : m[2] + 'g') : new RegExp(escape(p), 'gi');
    return { source: p, re };
  }).filter(Boolean);
}

export function redact(text, rules, replacement = '[REDACTED]') {
  let out = String(text);
  let count = 0;
  for (const { re } of rules) {
    re.lastIndex = 0;
    out = out.replace(re, () => { count++; return replacement; });
  }
  return { text: out, count };
}

export function redactMessages(messages, rules, replacement) {
  let count = 0;
  const out = messages.map((m) => {
    const r = redact(m.text, rules, replacement);
    count += r.count;
    return { ...m, text: r.text };
  });
  return { messages: out, count };
}
