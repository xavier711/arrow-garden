import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const source = (await readFile(new URL('../src/pwa.mjs', import.meta.url), 'utf8'))
  .replaceAll('import.meta.url', "'https://example.test/src/pwa.mjs'");
function target(extra = {}) {
  const handlers = {};
  return Object.assign({ hidden: false, textContent: '', open: false,
    addEventListener(type, fn) { (handlers[type] ??= []).push(fn); },
    async emit(type, event = {}) { for (const fn of handlers[type] ?? []) await fn(event); },
    setAttribute(name, value) { this[name] = value; },
    showModal() { this.open = true; }, close() { this.open = false; }
  }, extra);
}
function setup({ standalone = false, supported = true, rejected = false, build = 'development', sw, secure = true } = {}) {
  const nodes = new Map();
  const get = id => { if (!nodes.has(id)) nodes.set(id, target()); return nodes.get(id); };
  const modes = new Map();
  const document = target({ fullscreenEnabled: supported, readyState: 'complete',
    getElementById: get, querySelector: () => ({ content: build }), documentElement: {} });
  const navigator = { standalone, onLine: true, ...(sw ? { serviceWorker: sw } : {}) };
  const window = target({ isSecureContext: secure });
  let requests = 0;
  document.documentElement.requestFullscreen = async () => {
    requests++;
    if (rejected) throw Error('denied');
    document.fullscreenElement = document.documentElement;
  };
  document.exitFullscreen = async () => { document.fullscreenElement = null; };
  vm.runInNewContext(source, { document, navigator, window, URL, matchMedia: query => {
    const mode = target({ matches: false }); modes.set(query, mode); return mode;
  }});
  return { get, document, navigator, window, modes, requests: () => requests };
}
const tick = () => new Promise(resolve => setImmediate(resolve));
const normal = setup();
assert.equal(normal.get('help-dialog').open, false);
await normal.get('help').emit('click');
assert.equal(normal.get('help-dialog').open, true);
assert.equal(normal.get('start-dialog').open, true);
assert.equal(normal.requests(), 0, 'No fullscreen request without a gesture');
assert.equal(normal.get('install').hidden, false, 'Installation help must exist without an install event');
await normal.get('install').emit('click');
assert.equal(normal.get('install-dialog').open, true);
await normal.get('start-fullscreen').emit('click');
assert.equal(normal.requests(), 1);
assert.equal(normal.get('start-dialog').open, false);
normal.modes.get('(display-mode: fullscreen)').matches = true;
await normal.document.emit('fullscreenchange');
assert.equal(normal.get('install').hidden, false, 'A fullscreen tab is not an installed app');
await normal.get('fullscreen').emit('click');
assert.equal(normal.requests(), 1, 'Exiting fullscreen must not automatically reenter');
assert.equal(normal.get('start-dialog').open, false);
assert.equal(setup({ standalone: true }).get('start-dialog').open, false);
assert.equal(setup({ supported: false }).get('start-dialog').open, false);
const denied = setup({ rejected: true });
await denied.get('start-fullscreen').emit('click'); await tick();
assert.match(denied.get('install-status').textContent, /未能进入全屏/);
assert.equal(denied.get('start-dialog').open, false, 'Rejected fullscreen must not block play');
let prompted = 0;
await normal.window.emit('beforeinstallprompt', { preventDefault() {}, prompt: async () => prompted++, userChoice: Promise.resolve({ outcome: 'dismissed' }) });
await normal.get('install').emit('click');
assert.equal(prompted, 1);
await normal.get('install').emit('click');
assert.equal(prompted, 1, 'Consumed prompts must fall back to help');
let ready;
const sw = { register: async () => target({}), ready: new Promise(resolve => { ready = resolve; }) };
const offline = setup({ build: 'release', sw });
await tick();
assert.match(offline.get('offline-status').textContent, /正在准备/);
ready({ active: {} }); await tick();
assert.equal(offline.get('offline-status').textContent, '已准备好离线游玩');
offline.navigator.onLine = false; await offline.window.emit('offline');
assert.equal(offline.get('offline-status').textContent, '当前离线，可以继续玩');
const failed = setup({ build: 'release', sw: { register: async () => { throw Error('network'); } } });
await tick(); assert.match(failed.get('offline-status').textContent, /未完成/);
assert.match(setup({ build: 'release', secure: false }).get('offline-status').textContent, /HTTPS/);
console.log('PASS: fullscreen startup/rejection/exit; install fallback; offline readiness and registration failure.');
