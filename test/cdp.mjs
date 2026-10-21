// Minimal CDP client: attach to an already open tab, evaluate, screenshot.

export async function attach(urlPattern, port = 9555) {
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const tab = targets.find((t) => t.type === 'page' && urlPattern.test(t.url));
  if (!tab) throw new Error(`no open tab matching ${urlPattern} on CDP port ${port}`);

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = () => rej(new Error(`cannot attach to ${tab.url}`));
  });
  const pending = new Map();
  let id = 0;
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    const p = pending.get(m.id);
    if (!p) return;
    pending.delete(m.id);
    m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result);
  };
  const send = (method, params = {}) => new Promise((res, rej) => {
    pending.set(++id, { res, rej });
    ws.send(JSON.stringify({ id, method, params }));
  });

  return {
    url: tab.url,
    send,
    close: () => ws.close(),
    async eval(expression) {
      const r = await send('Runtime.evaluate', {
        expression, awaitPromise: true, returnByValue: true, userGesture: true,
      });
      if (r.exceptionDetails) throw new Error(`page threw: ${JSON.stringify(r.exceptionDetails).slice(0, 400)}`);
      return r.result.value;
    },
    async screenshot() {
      const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      return Buffer.from(r.data, 'base64');
    },
  };
}
