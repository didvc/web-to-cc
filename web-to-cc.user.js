// ==UserScript==
// @name         web-to-cc: export Claude chat
// @namespace    web-to-cc
// @version      1.0.0
// @description  Export the open claude.ai chat as JSON for the web-to-cc CLI (pair selection + pre-redaction)
// @match        https://claude.ai/*
// @run-at       document-idle
// @grant        GM_registerMenuCommand
// @grant        GM_setClipboard
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(() => {
  'use strict';

  const DEFAULTS = {
    pairs: 'all',
    keepThinking: false,
    imagePlaceholder: true,
    builtinRedactions: false,
    redactWith: '[REDACTED]',
    redactions: '',
    sink: 'file',
  };

  const BUILTIN = [
    String.raw`/[\w.+-]+@[\w-]+\.[\w.]{2,}/g`,
    String.raw`/\b(?:\d{1,3}\.){3}\d{1,3}\b/g`,
    String.raw`/\b(?:sk|pk|ghp|gho|xox[abps])-[A-Za-z0-9_-]{16,}\b/g`,
    String.raw`/\b[A-Za-z0-9_-]*(?:api|secret|token|passwd|password)[A-Za-z0-9_-]*\s*[:=]\s*\S+/gi`,
  ];

  const hasGM = (fn) => typeof fn === 'function';
  const store = {
    get() {
      const raw = hasGM(typeof GM_getValue !== 'undefined' && GM_getValue)
        ? GM_getValue('config', null)
        : localStorage.getItem('web-to-cc:config');
      let saved = {};
      try { saved = typeof raw === 'string' ? JSON.parse(raw) : raw || {}; } catch { saved = {}; }
      return { ...DEFAULTS, ...saved };
    },
    set(cfg) {
      const raw = JSON.stringify(cfg);
      if (hasGM(typeof GM_setValue !== 'undefined' && GM_setValue)) GM_setValue('config', raw);
      else localStorage.setItem('web-to-cc:config', raw);
    },
  };

  const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

  const conversationId = () => {
    const hit = location.pathname.split('/').reverse().find((s) => UUID.test(s));
    if (!hit) throw new Error('open a chat first (no conversation id in the URL)');
    return hit;
  };

  const json = async (url) => {
    const r = await fetch(url, { credentials: 'include', headers: { accept: 'application/json' } });
    if (!r.ok) throw new Error(`${url} -> HTTP ${r.status}`);
    return r.json();
  };

  async function fetchConversation() {
    const orgs = await json('/api/organizations');
    const org = (orgs || []).find((o) => o && o.uuid);
    if (!org) throw new Error('no organization on this account session');
    const id = conversationId();
    return json(`/api/organizations/${org.uuid}/chat_conversations/${id}`
      + '?tree=True&rendering_mode=messages&render_all_tools=true');
  }

  function flatten(msg, cfg) {
    const parts = [];
    let img = 0;
    for (const b of msg.content || []) {
      if (b.type === 'text' && b.text) parts.push(b.text);
      else if (b.type === 'thinking' && cfg.keepThinking && b.thinking) parts.push(b.thinking);
      else if (b.type === 'image' && cfg.imagePlaceholder) {
        const f = (msg.files || [])[img++];
        parts.push(`[image omitted: ${(f && f.file_name) || b.file_uuid || 'unnamed'}]`);
      } else if (b.type === 'tool_use' && b.name) parts.push(`[tool: ${b.name}]`);
    }
    return parts.join('\n\n').trim() || (msg.text || '').trim();
  }

  function selectPairs(messages, spec) {
    if (!spec || spec === 'all') return messages;
    const m = String(spec).match(/^(?:(first|last):)?(\d+)$/);
    if (!m) throw new Error(`bad pairs setting: ${spec}`);
    const pairs = [];
    for (const msg of messages) {
      if (msg.role === 'user' || !pairs.length) pairs.push([msg]);
      else pairs[pairs.length - 1].push(msg);
    }
    const n = Number(m[2]);
    return ((m[1] || 'last') === 'first' ? pairs.slice(0, n) : pairs.slice(-n)).flat();
  }

  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  function compile(cfg) {
    const lines = [...(cfg.builtinRedactions ? BUILTIN : []), ...String(cfg.redactions || '').split(/\r?\n/)];
    return lines.map((raw) => {
      const p = raw.trim();
      if (!p || p.startsWith('#')) return null;
      const m = p.match(/^\/(.*)\/([gimsuy]*)$/);
      try {
        return m ? new RegExp(m[1], m[2].includes('g') ? m[2] : m[2] + 'g') : new RegExp(escapeRe(p), 'gi');
      } catch {
        return null;
      }
    }).filter(Boolean);
  }

  async function build(overrides = {}) {
    const cfg = { ...store.get(), ...overrides };
    const conv = await fetchConversation();
    const all = (conv.chat_messages || [])
      .slice()
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
      .map((m) => ({
        role: m.sender === 'assistant' ? 'assistant' : 'user',
        text: flatten(m, cfg),
        uuid: m.uuid,
        createdAt: m.created_at,
      }))
      .filter((m) => m.text);

    const rules = compile(cfg);
    let redactionCount = 0;
    const messages = selectPairs(all, cfg.pairs).map((m) => {
      let text = m.text;
      for (const re of rules) {
        re.lastIndex = 0;
        text = text.replace(re, () => { redactionCount++; return cfg.redactWith; });
      }
      return { ...m, text };
    });

    return {
      source: 'claude-web',
      version: 1,
      exportedAt: new Date().toISOString(),
      conversation: {
        uuid: conv.uuid,
        name: conv.name,
        model: conv.model,
        createdAt: conv.created_at,
        url: `https://claude.ai/chat/${conv.uuid}`,
      },
      options: { pairs: cfg.pairs, keepThinking: cfg.keepThinking, imagePlaceholder: cfg.imagePlaceholder },
      redactionCount,
      messages,
    };
  }

  const slug = (s) => String(s || 'chat').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);

  function download(payload) {
    const name = `claude-web-${slug(payload.conversation.name)}-${String(payload.conversation.uuid).slice(0, 8)}.json`;
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 1)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 2000);
    return name;
  }

  async function copy(payload) {
    const text = JSON.stringify(payload, null, 1);
    if (hasGM(typeof GM_setClipboard !== 'undefined' && GM_setClipboard)) GM_setClipboard(text, 'text');
    else await navigator.clipboard.writeText(text);
    return 'clipboard';
  }

  async function run(sink, overrides) {
    try {
      const payload = await build(overrides);
      const where = (sink || store.get().sink) === 'clipboard' ? await copy(payload) : download(payload);
      toast(`exported ${payload.messages.length} messages -> ${where}`
        + (payload.redactionCount ? ` (${payload.redactionCount} redacted)` : ''));
      return payload;
    } catch (e) {
      toast(`export failed: ${e.message}`, true);
      throw e;
    }
  }

  let host;
  const ui = () => {
    if (host) return host.shadowRoot;
    host = document.createElement('div');
    host.id = 'web-to-cc-ui';
    host.style.cssText = 'all:initial;position:fixed;z-index:2147483647;inset:auto 16px 16px auto';
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>
      :host{font:13px/1.45 ui-sans-serif,system-ui,sans-serif}
      .toast{background:#1b1b1f;color:#f2f2f2;padding:9px 13px;border-radius:9px;margin-top:8px;
             box-shadow:0 6px 24px #0007;max-width:360px}
      .toast.bad{background:#5d1a1a}
      .panel{background:#fff;color:#16161a;border:1px solid #d9d9e0;border-radius:12px;padding:14px;
             width:340px;box-shadow:0 10px 36px #0003}
      h2{margin:0 0 10px;font-size:14px}
      label{display:block;margin:9px 0 3px;font-size:12px;color:#44444c}
      input[type=text],textarea,select{width:100%;box-sizing:border-box;font:12px ui-monospace,monospace;
             padding:5px 7px;border:1px solid #cfcfd6;border-radius:7px;background:#fff;color:#16161a}
      textarea{height:74px;resize:vertical}
      .row{display:flex;gap:8px;align-items:center;margin-top:6px}
      .row label{margin:0;font-size:12px}
      .btns{display:flex;gap:8px;margin-top:13px}
      button{font:12px ui-sans-serif,system-ui,sans-serif;padding:6px 11px;border-radius:7px;
             border:1px solid #cfcfd6;background:#f6f6f8;color:#16161a;cursor:pointer}
      button.primary{background:#16161a;color:#fff;border-color:#16161a}
      @media (prefers-color-scheme:dark){
        .panel{background:#1b1b1f;color:#f2f2f2;border-color:#33333b}
        label{color:#aeaeb8}
        input[type=text],textarea,select{background:#111114;color:#f2f2f2;border-color:#3a3a44}
        button{background:#2a2a31;color:#f2f2f2;border-color:#3a3a44}
        button.primary{background:#f2f2f2;color:#16161a;border-color:#f2f2f2}
      }</style><div id="slot"></div>`;
    document.body.appendChild(host);
    return root;
  };

  function toast(text, bad) {
    const root = ui();
    const el = document.createElement('div');
    el.className = `toast${bad ? ' bad' : ''}`;
    el.textContent = `web-to-cc: ${text}`;
    root.getElementById('slot').appendChild(el);
    setTimeout(() => el.remove(), bad ? 7000 : 4000);
  }

  function settings() {
    const root = ui();
    const slot = root.getElementById('slot');
    if (slot.querySelector('.panel')) return;
    const cfg = store.get();
    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.innerHTML = `<h2>web-to-cc export settings</h2>
      <label>pairs (all | first:N | last:N)</label><input type="text" id="pairs">
      <label>sink</label><select id="sink"><option value="file">file</option><option value="clipboard">clipboard</option></select>
      <label>redaction patterns (one per line: word or /regex/flags)</label><textarea id="redactions"></textarea>
      <label>replacement</label><input type="text" id="redactWith">
      <div class="row"><input type="checkbox" id="builtinRedactions"><label for="builtinRedactions">mask emails, IPs, api keys</label></div>
      <div class="row"><input type="checkbox" id="keepThinking"><label for="keepThinking">keep thinking blocks</label></div>
      <div class="row"><input type="checkbox" id="imagePlaceholder"><label for="imagePlaceholder">note omitted images</label></div>
      <div class="btns"><button class="primary" id="save">save</button><button id="export">save &amp; export</button>
      <button id="close">close</button></div>`;
    slot.appendChild(panel);
    const f = (id) => panel.querySelector(`#${id}`);
    f('pairs').value = cfg.pairs;
    f('sink').value = cfg.sink;
    f('redactions').value = cfg.redactions;
    f('redactWith').value = cfg.redactWith;
    for (const k of ['builtinRedactions', 'keepThinking', 'imagePlaceholder']) f(k).checked = !!cfg[k];
    const save = () => {
      store.set({
        pairs: f('pairs').value.trim() || 'all',
        sink: f('sink').value,
        redactions: f('redactions').value,
        redactWith: f('redactWith').value || DEFAULTS.redactWith,
        builtinRedactions: f('builtinRedactions').checked,
        keepThinking: f('keepThinking').checked,
        imagePlaceholder: f('imagePlaceholder').checked,
      });
    };
    f('save').onclick = () => { save(); panel.remove(); toast('settings saved'); };
    f('export').onclick = () => { save(); panel.remove(); run(); };
    f('close').onclick = () => panel.remove();
  }

  if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand('Export chat -> file', () => run('file'));
    GM_registerMenuCommand('Export chat -> clipboard', () => run('clipboard'));
    GM_registerMenuCommand('Export settings...', settings);
  }

  window.webToCc = { build, run, settings, config: store };
})();
