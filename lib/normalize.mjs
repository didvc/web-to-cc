// Any shape of exported claude.ai chat data -> { conversation, messages }.

const ROLE = { human: 'user', user: 'user', assistant: 'assistant' };

export function flattenBlocks(blocks, text, opts = {}) {
  const { keepThinking = false, imagePlaceholder = true, files = [] } = opts;
  const parts = [];
  let imageIndex = 0;
  for (const b of blocks || []) {
    if (b.type === 'text' && b.text) parts.push(b.text);
    else if (b.type === 'thinking' && keepThinking && b.thinking) parts.push(b.thinking);
    else if (b.type === 'image' && imagePlaceholder) {
      const f = files[imageIndex++];
      parts.push(`[image omitted: ${(f && (f.file_name || f.name)) || b.file_uuid || 'unnamed'}]`);
    } else if (b.type === 'tool_use' && b.name) {
      parts.push(`[tool: ${b.name}]`);
    }
  }
  const out = parts.join('\n\n').trim();
  return out || (text || '').trim();
}

function fromApiMessage(m, opts) {
  return {
    role: ROLE[m.sender] || 'user',
    text: flattenBlocks(m.content, m.text, { ...opts, files: m.files }),
    uuid: m.uuid,
    createdAt: m.created_at,
    index: m.index,
  };
}

export function normalize(data, opts = {}) {
  if (!data || typeof data !== 'object') throw new Error('chat data must be an object or array');

  if (Array.isArray(data)) {
    return data.length && data[0] && data[0].sender
      ? { conversation: {}, messages: order(data.map((m) => fromApiMessage(m, opts))) }
      : { conversation: {}, messages: order(data.map(fromEnvelopeMessage)) };
  }

  if (Array.isArray(data.chat_messages)) {
    return {
      conversation: {
        uuid: data.uuid,
        name: data.name,
        model: data.model,
        createdAt: data.created_at,
        url: data.uuid ? `https://claude.ai/chat/${data.uuid}` : undefined,
      },
      messages: order(data.chat_messages.map((m) => fromApiMessage(m, opts))),
    };
  }

  if (Array.isArray(data.messages)) {
    return {
      conversation: data.conversation || {},
      messages: order(data.messages.map((m) => (m.sender ? fromApiMessage(m, opts) : fromEnvelopeMessage(m)))),
    };
  }

  throw new Error('unrecognized chat data: expected chat_messages[] or messages[]');
}

function fromEnvelopeMessage(m) {
  return {
    role: ROLE[m.role] || ROLE[m.sender] || 'user',
    text: typeof m.text === 'string' ? m.text : flattenBlocks(m.content, m.text),
    uuid: m.uuid,
    createdAt: m.createdAt || m.created_at,
    index: m.index,
  };
}

function order(messages) {
  const kept = messages.filter((m) => m.text);
  const indexed = kept.every((m) => Number.isInteger(m.index));
  if (indexed) kept.sort((a, b) => a.index - b.index);
  else if (kept.every((m) => m.createdAt)) kept.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  return kept;
}

// pairs: 'all' | 'first:N' | 'last:N' | N (= last:N)
export function selectPairs(messages, spec) {
  if (!spec || spec === 'all') return messages;
  const m = String(spec).match(/^(?:(first|last):)?(\d+)$/);
  if (!m) throw new Error(`bad --pairs spec: ${spec} (use all, first:N or last:N)`);
  const side = m[1] || 'last';
  const n = Number(m[2]);
  const pairs = [];
  for (const msg of messages) {
    if (msg.role === 'user' || !pairs.length) pairs.push([msg]);
    else pairs[pairs.length - 1].push(msg);
  }
  const picked = side === 'first' ? pairs.slice(0, n) : pairs.slice(-n);
  return picked.flat();
}
