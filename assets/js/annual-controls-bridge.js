import {annualEventControlsUrl} from './annual-readiness.js?v=20261028a';

const CHANNEL = 'asme-annual-controls-v1';
const HUB_ORIGIN = 'https://asme-osu.github.io';
const googleOrigin = value => /^https:\/\/(?:script\.google\.com|script\.googleusercontent\.com|[a-z0-9-]+-script\.googleusercontent\.com)$/.test(value);
const fields = ['year', 'mode', 'runKey', 'configRevision'];

// HTML Service nests its sandbox inside Google's outer frame. Check ancestry,
// rather than accepting an unrelated Google window with the same message shape.
export function annualControlsSourceMatches(source, frameWindow) {
  if (!source || !frameWindow) return false;
  try {
    for (let depth = 0; source && depth < 8; depth++) {
      if (source === frameWindow) return true;
      const parent = source.parent;
      if (parent === source) return false;
      source = parent;
    }
  } catch { /* An inaccessible/unrelated window never authorizes an action. */ }
  return false;
}

export function runEmbeddedAnnualAction(options, environment = {}) {
  const win = environment.window || window, doc = environment.document || document;
  const random = environment.crypto || globalThis.crypto;
  const schedule = environment.setTimeout || setTimeout, cancel = environment.clearTimeout || clearTimeout;
  return new Promise((resolve, reject) => {
    let frame, timer, target, started = false, settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true; cancel(timer); win.removeEventListener('message', receive); frame?.remove();
      if (error) reject(error); else resolve(value);
    };
    const expired = () => finish(Error(started ? 'Google has not confirmed the action. Check connections before retrying; keep the same year and files.' : 'Google could not open the in-Hub controls. Use Chrome’s ASME profile with only the chapter account, or choose Open Google setup under Google sign-in or connection help. No connection action was sent.'));
    const context = Object.fromEntries(fields.map(key => [key, options.context?.[key]]));
    function receive(event) {
      const data = event.data;
      if (settled || !googleOrigin(event.origin) || !annualControlsSourceMatches(event.source, frame?.contentWindow) || !data || data.channel !== CHANNEL || data.nonce !== nonce || !fields.every(key => data[key] === context[key])) return;
      if (target && target !== event.source) return;
      try {
        options.assertContext();
        if (data.type === 'ready' && !started) {
          options.assertBeforeSend?.();
          target = event.source; started = true; cancel(timer); timer = schedule(expired, 390000);
          target.postMessage({channel: CHANNEL, nonce, ...context, type: 'run', action: options.action, ...(options.action === 'stop' ? {confirmStop: true} : {})}, event.origin);
        } else if (started && data.type === 'result') finish(null, data.report);
        else if (data.type === 'error') finish(Error(typeof data.message === 'string' ? data.message.slice(0, 2000) : 'Google could not complete this action. Check connections before retrying.'));
      } catch (error) { finish(error); }
    }
    let nonce;
    try {
      if (win.location.origin !== HUB_ORIGIN) throw Error('In-Hub Google controls are available on the live Officer Hub. Use the manual fallback for a local preview.');
      if (!['connect', 'stop'].includes(options.action) || (options.action === 'stop' && options.confirmStop !== true)) throw Error('Confirm the selected action before continuing.');
      options.assertContext();
      nonce = Array.from(random.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
      const url = new URL(annualEventControlsUrl(options.url, options.context));
      url.searchParams.set('embed', 'hub'); url.searchParams.set('nonce', nonce);
      frame = doc.createElement('iframe'); frame.hidden = true; frame.title = 'Google annual connection'; frame.referrerPolicy = 'no-referrer';
      frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox');
      frame.src = url.href;
      win.addEventListener('message', receive); timer = schedule(expired, 30000); doc.body.append(frame);
    } catch (error) { finish(error); }
  });
}
