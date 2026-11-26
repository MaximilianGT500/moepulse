import assert from 'node:assert/strict';
import { createPublicKey, verify } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, test } from 'node:test';
import * as source from '../src/moepulse.ts';
import {
  canonical,
  createPulse,
  describe as consentText,
  fingerprint,
  handleSupport,
  parseStack,
  scrub,
  scrubber,
  SDK_VERSION,
  type PulseOptions,
} from '../src/moepulse.ts';

const ENDPOINT = 'https://pulse.test';

delete process.env.MOEPULSE_ENDPOINT;
delete process.env.MOEPULSE_DISABLED;

interface Call {
  method: string;
  path: string;
  headers: Headers;
  redirect: RequestInit['redirect'];
  body: Record<string, unknown> | null;
}

const release = {
  version: '1.9.0',
  title: 'Schneller',
  date: Date.UTC(2026, 10, 20, 12),
  dateText: '20. November 2026',
  url: 'https://moecloud.moestudio.net/changelog.html#1.9.0',
  security: false,
  channel: 'stable',
  notes: '### Neu\n\n- Fotos sortieren',
};

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
}

function fakePulse(update: Record<string, unknown> = {}) {
  const calls: Call[] = [];
  const keys = new Map<string, string>();
  const fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    const text = request.method === 'POST' ? await request.text() : '';
    const body = text ? (JSON.parse(text) as Record<string, unknown>) : null;
    calls.push({ method: request.method, path: url.pathname + url.search, headers: request.headers, redirect: init?.redirect, body });
    if (request.method === 'GET' && url.pathname.startsWith('/v1/updates/'))
      return json({
        ok: true,
        channel: 'stable',
        latest: release,
        update: true,
        security: false,
        yanked: false,
        supported: true,
        minimum: null,
        behind: 1,
        releases: [release],
        ...update,
      });
    const install = request.headers.get('moepulse-install') ?? '';
    const key = typeof body?.key === 'string' && body.key ? body.key : keys.get(install);
    if (!key) return json({ ok: false, error: 'unknown' }, 404);
    const signed = canonical(
      'POST',
      url.pathname,
      install,
      request.headers.get('moepulse-time') ?? '',
      request.headers.get('moepulse-nonce') ?? '',
      text
    );
    const valid = verify(
      null,
      Buffer.from(signed),
      createPublicKey({ key: Buffer.from(key, 'base64url'), format: 'der', type: 'spki' }),
      Buffer.from(request.headers.get('moepulse-signature') ?? '', 'base64url')
    );
    if (!valid) return json({ ok: false, error: 'signature' }, 401);
    keys.set(install, key);
    if (url.pathname === '/v1/heartbeat')
      return json({ ok: true, interval: 21_600, errors: true, now: Date.now(), support: { unread: 0 }, notices: [] });
    if (url.pathname === '/v1/events') return json({ ok: true, accepted: (body?.events as unknown[]).length });
    if (url.pathname === '/v1/forget') {
      keys.delete(install);
      return json({ ok: true });
    }
    return json({ ok: false, error: 'not_found' }, 404);
  }) as typeof globalThis.fetch;
  return { calls, fetch };
}

const tempDir = () => mkdtempSync(join(tmpdir(), 'moepulse-client-'));
const running: Array<{ stop(): Promise<void> }> = [];

function client(fetch: typeof globalThis.fetch, overrides: Partial<PulseOptions> = {}) {
  const pulse = createPulse({
    app: 'moecloud',
    version: '1.8.0',
    dataDir: tempDir(),
    endpoint: ENDPOINT,
    consent: () => true,
    fetch,
    crashes: false,
    ...overrides,
  });
  running.push(pulse);
  return pulse;
}

afterEach(async () => {
  await Promise.all(running.splice(0).map((pulse) => pulse.stop()));
  delete process.env.MOEPULSE_DISABLED;
});

describe('Bereinigung', () => {
  test('entfernt persönliche Daten und behält Programmstellen', () => {
    const clean = scrubber({
      root: '/opt/moecloud',
      paths: { data: '/data', uploads: '/opt/moecloud/uploads' },
      extra: ['cloud.example.com'],
    });
    assert.equal(
      clean("ENOENT: no such file or directory, open '/data/files/mia/urlaub.jpg'"),
      "ENOENT: no such file or directory, open '[data]/files/…'"
    );
    assert.equal(clean('Fetch https://cloud.example.com/api/files/12?token=abc from 192.168.1.20'), 'Fetch https://[host]/api/… from [ip]');
    assert.equal(clean('User lea@example.org failed'), 'User [email] failed');
    assert.equal(clean('upload /opt/moecloud/uploads/emi/geheim.png'), 'upload [uploads]/…');
    assert.equal(clean('at handler (/opt/moecloud/src/routes/files.ts:120:14)'), 'at handler (src/routes/files.ts:120:14)');
    assert.equal(clean('Bearer 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'), 'Bearer [token]');
    assert.equal(clean('session=Zx81kLmQ9pT0aV7bY2cD expired'), 'session=[redacted] expired');
    assert.equal(clean('C:\\Users\\Emily\\Desktop\\x.txt'), '~/Desktop/…');
    assert.equal(clean('version 1.8.0 at 12:30:45, status code: 500'), 'version 1.8.0 at 12:30:45, status code: 500');
  });

  test('bleibt auch bei bösartigen Texten schnell und ist idempotent', () => {
    const clean = scrubber();
    for (const sample of ['1.'.repeat(50_000), `${'a'.repeat(30_000)}@`, `${'x='.repeat(20_000)}y`, `https://${'a.'.repeat(20_000)}`]) {
      const started = performance.now();
      clean(sample);
      assert.ok(performance.now() - started < 250, sample.slice(0, 12));
    }
    const once = scrub('Fehler bei https://cloud.example.com/view/x.png für mia@example.com aus 10.0.0.1');
    assert.equal(scrub(once), once);
  });
});

describe('Programmstellen', () => {
  const stack = [
    "TypeError: Cannot read properties of undefined (reading 'id')",
    '    at handler (/opt/moecloud/src/routes/files.ts:120:14)',
    '    at Layer.handle (/opt/moecloud/node_modules/fastify/lib/route.js:5:7)',
    '    at file:///opt/moecloud/src/server.ts:10:1',
  ].join('\n');

  test('erkennt eigene Programmstellen und gruppiert über Zeilennummern hinweg', () => {
    const frames = parseStack(stack, '/opt/moecloud');
    assert.deepEqual(
      frames.map((frame) => [frame.file, frame.app]),
      [
        ['src/routes/files.ts', true],
        ['node_modules/fastify/lib/route.js', false],
        ['src/server.ts', true],
      ]
    );
    const moved = parseStack(stack.replace(':120:14', ':135:2'), '/opt/moecloud');
    assert.equal(fingerprint('TypeError', 'x', frames), fingerprint('TypeError', 'y', moved));
  });

  test('liefert dieselben Texte für die Einwilligung in allen Apps', () => {
    assert.match(consentText('de', 'MoeCloud').summary, /MoeCloud/);
    assert.ok(consentText('en').stats.length >= 4);
  });
});

describe('Client', () => {
  test('schickt ohne Einwilligung nichts und legt nichts an', async () => {
    const { calls, fetch } = fakePulse();
    const dataDir = tempDir();
    const pulse = client(fetch, { dataDir, consent: () => false });
    await pulse.start();
    pulse.capture(new Error('nichts'));
    pulse.count('upload');
    await pulse.flush(200);
    assert.equal(calls.length, 0);
    assert.equal(existsSync(join(dataDir, 'moepulse')), false);
    assert.equal(pulse.status().running, false);
  });

  test('MOEPULSE_DISABLED=1 schaltet alles fest ab', async () => {
    process.env.MOEPULSE_DISABLED = '1';
    const { calls, fetch } = fakePulse();
    const pulse = client(fetch);
    await pulse.start();
    assert.equal(await pulse.checkUpdate(), null);
    assert.equal(calls.length, 0);
  });

  test('meldet sich mit gültiger Signatur und schützt die Identität', async () => {
    const { calls, fetch } = fakePulse();
    const dataDir = tempDir();
    const pulse = client(fetch, {
      dataDir,
      metrics: () => ({ users: 12 }),
      features: () => ({ database: 'sqlite', mail: 'mia@example.com' }),
    });
    await pulse.start();
    assert.deepEqual(
      calls.map((call) => call.path),
      ['/v1/heartbeat']
    );
    const body = calls[0].body!;
    assert.equal(body.sdk, SDK_VERSION);
    assert.equal(body.scope, 'full');
    assert.deepEqual(body.metrics, { users: 12 });
    assert.deepEqual(body.features, { database: 'sqlite', mail: '[email]' });
    assert.equal(pulse.status().lastError ?? null, null);
    const file = join(dataDir, 'moepulse', 'identity.json');
    assert.ok(existsSync(file));
    if (process.platform !== 'win32') assert.equal(statSync(file).mode & 0o777, 0o600);
  });

  test('teilt nur Fehlerberichte, wenn nur die erlaubt sind', async () => {
    const { calls, fetch } = fakePulse();
    const pulse = client(fetch, { consent: () => ({ stats: false, errors: true }) });
    await pulse.start();
    pulse.count('upload', 3);
    pulse.capture(new Error('Nur der Fehler'));
    await pulse.flush();
    const heartbeat = calls.find((call) => call.path === '/v1/heartbeat')!.body!;
    assert.equal(heartbeat.scope, 'errors');
    for (const key of ['system', 'features', 'metrics', 'counters']) assert.equal(key in heartbeat, false, key);
    assert.equal(calls.filter((call) => call.path === '/v1/events').length, 1);
  });

  test('fasst gleiche Fehler zusammen und bereinigt sie', async () => {
    const { calls, fetch } = fakePulse();
    const pulse = client(fetch);
    await pulse.start();
    for (let index = 0; index < 5; index++) pulse.capture(new Error(`Datei ${index} von lea@example.org fehlt`));
    await pulse.flush();
    const sent = calls.filter((call) => call.path === '/v1/events');
    assert.equal(sent.length, 1);
    const events = sent[0].body!.events as Array<{ message: string; count: number }>;
    assert.equal(
      events.reduce((sum, event) => sum + event.count, 0),
      5
    );
    assert.ok(events.every((event) => !event.message.includes('lea@example.org')));
  });

  test('zeigt eine Vorschau, ohne etwas anzulegen', async () => {
    const { calls, fetch } = fakePulse();
    const dataDir = tempDir();
    const pulse = client(fetch, { dataDir, consent: () => false });
    const preview = await pulse.preview();
    assert.equal(preview.endpoint, ENDPOINT);
    assert.equal(preview.installId, null);
    assert.ok(preview.heartbeat.system?.os.platform);
    assert.equal(calls.length, 0);
    assert.equal(existsSync(join(dataDir, 'moepulse')), false);
  });

  test('spricht nur verschlüsselt und folgt keinen Weiterleitungen', async () => {
    const { calls, fetch } = fakePulse();
    const plain = client(fetch, { endpoint: 'http://pulse.example', log: () => {} });
    await plain.start();
    await assert.rejects(plain.support.create({ subject: 'Hallo', message: 'Kommt das an oder nicht?' }), /abgeschaltet/);
    assert.equal(calls.length, 0);
    await client(fetch).start();
    assert.deepEqual(
      calls.map((call) => call.redirect),
      ['error']
    );
  });

  test('fragt Updates ohne Kennung und ohne Einwilligung', async () => {
    const { calls, fetch } = fakePulse();
    const dataDir = tempDir();
    const pulse = client(fetch, { dataDir, consent: () => false });
    const info = await pulse.checkUpdate();
    assert.deepEqual([info?.latest?.version, info?.update, info?.behind], ['1.9.0', true, 1]);
    assert.deepEqual(
      calls.map((call) => [call.method, call.path]),
      [['GET', '/v1/updates/moecloud?version=1.8.0&channel=stable']]
    );
    assert.deepEqual(
      [...calls[0].headers.keys()].filter((name) => name.startsWith('moepulse-')),
      []
    );
    assert.equal(existsSync(join(dataDir, 'moepulse')), false);
    await pulse.checkUpdate();
    assert.equal(calls.length, 1);
    await pulse.checkUpdate({ force: true });
    assert.equal(calls.length, 2);
    assert.equal(pulse.update()?.latest, '1.9.0');
  });

  test('erkennt nicht mehr unterstützte Versionen', async () => {
    const { fetch } = fakePulse({ supported: false, minimum: '1.8.5' });
    const pulse = client(fetch, { consent: () => false });
    const info = await pulse.checkUpdate();
    assert.deepEqual([info?.supported, info?.minimum], [false, '1.8.5']);
    assert.equal(pulse.update()?.supported, false);
    const old = client(fakePulse({ supported: undefined, minimum: '<script>' }).fetch, { consent: () => false });
    const fallback = await old.checkUpdate();
    assert.deepEqual([fallback?.supported, fallback?.minimum], [true, null]);
  });

  test('hält sich an eine Sperre und macht nach dem Aufheben weiter', async () => {
    const { calls, fetch } = fakePulse();
    let locked = true;
    const guarded = (async (input: string | URL | Request, init?: RequestInit) =>
      locked && init?.method === 'POST' ? json({ ok: false, error: 'blocked' }, 403) : fetch(input, init)) as typeof globalThis.fetch;
    const pulse = client(guarded);
    await pulse.start();
    assert.deepEqual([pulse.status().blocked, pulse.status().lastError], [true, 'HTTP 403 blocked']);
    pulse.capture(new Error('gesperrt'));
    await pulse.flush(200);
    await assert.rejects(pulse.support.list(), (error: Error & { code?: string }) => error.code === 'blocked');
    assert.equal(calls.length, 0);
    locked = false;
    await pulse.refresh();
    assert.deepEqual([pulse.status().blocked, pulse.status().lastError], [false, null]);
    assert.deepEqual(
      calls.map((call) => call.path),
      ['/v1/heartbeat']
    );
  });

  test('löscht mit forget() alles bei MoePulse und lokal', async () => {
    const { calls, fetch } = fakePulse();
    const dataDir = tempDir();
    const pulse = client(fetch, { dataDir });
    await pulse.start();
    assert.equal(await pulse.forget(), true);
    assert.equal(calls.at(-1)?.path, '/v1/forget');
    assert.equal(existsSync(join(dataDir, 'moepulse', 'identity.json')), false);
  });

  test('bringt die App nie zum Absturz, wenn MoePulse nicht erreichbar ist', async () => {
    const pulse = client((async () => {
      throw new Error('getaddrinfo ENOTFOUND pulse.test');
    }) as typeof globalThis.fetch);
    await pulse.start();
    pulse.capture(new Error('egal'));
    await pulse.flush(200);
    assert.equal(await pulse.checkUpdate(), null);
    assert.match(pulse.status().lastError ?? '', /Netzwerk/);
  });

  test('handleSupport nimmt nur bekannte Aktionen an', async () => {
    const { calls, fetch } = fakePulse();
    const pulse = client(fetch, { consent: () => false });
    assert.equal((await handleSupport(pulse, { action: 'drop-tables' })).status, 400);
    assert.equal((await handleSupport(pulse, null)).status, 400);
    assert.equal(calls.length, 0);
  });
});

describe('Build', () => {
  test('dist passt zum Quellcode', async () => {
    const built = (await import(new URL('../dist/moepulse.mjs', import.meta.url).href)) as Record<string, unknown>;
    assert.equal(built.SDK_VERSION, SDK_VERSION, 'dist ist veraltet, bitte npm run build ausführen');
    assert.deepEqual(Object.keys(built).sort(), Object.keys(source).sort());
    const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string };
    assert.equal(manifest.version, SDK_VERSION, 'Version in package.json und SDK_VERSION gehören zusammen');
    assert.ok(existsSync(new URL('../dist/moepulse.d.mts', import.meta.url)));
  });
});
