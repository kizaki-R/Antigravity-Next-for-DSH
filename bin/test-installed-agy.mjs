#!/usr/bin/env node
// Entirely synthetic, offline fixtures. Never print actual installed OAuth values.
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink, truncate, realpath } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { discoverInstalledAgy, InstalledAgyError } from '../lib/installed-agy.js';

const cleanupFs = process.versions.electron === undefined
  ? { rm }
  : createRequire(import.meta.url)('original-fs').promises;

const temporary = await mkdtemp(join(tmpdir(), 'agy-installed-test-'));
// macOS resolves /var through /private/var, so canonicalise the temp root once
// and compare the canonical directory against a canonicalised prefix.
const temporaryRoot = await realpath(tmpdir());
const id = '123456789012-' + 'a'.repeat(32) + '.apps.googleusercontent.com';
const secret = 'GOCSPX-' + 'b'.repeat(28);
const pkg = { name: 'antigravity', productName: 'Antigravity', version: '2.25.0',
  homepage: 'https://antigravity.google', author: { name: 'Google' }, main: 'dist/main.js' };
const pair = { clientId: id, clientSecret: secret };
function asar(files, mutate = () => {}) {
  const header = { files: {} }, bodies = []; let offset = 0;
  for (const [path, body] of Object.entries(files)) {
    const bytes = Buffer.from(body), segments = path.split('/'); let node = header;
    for (const part of segments.slice(0, -1)) node = node.files[part] ??= { files: {} };
    node.files[segments.at(-1)] = { offset: String(offset), size: bytes.length };
    bodies.push(bytes); offset += bytes.length;
  }
  mutate(header);
  const json = Buffer.from(JSON.stringify(header)), size = 8 + Math.ceil(json.length / 4) * 4;
  const prefix = Buffer.alloc(8 + size);
  [4, size, size - 4, json.length].forEach((n, i) => prefix.writeUInt32LE(n, i * 4));
  json.copy(prefix, 16);
  return Buffer.concat([prefix, ...bodies]);
}
function native({ ambiguous = false, wrongName = false, badPointer = false } = {}) {
  const b = Buffer.alloc(12800), pe = 128, opt = pe + 24, sh = opt + 240;
  b.write('MZ'); b.writeUInt32LE(pe, 60); b.writeUInt32LE(0x4550, pe);
  b.writeUInt16LE(0x8664, pe + 4); b.writeUInt16LE(2, pe + 6); b.writeUInt16LE(240, pe + 20); b.writeUInt16LE(0x20b, opt);
  function section(at, name, va, raw, size) {
    b.write(name, at); b.writeUInt32LE(va, at + 12); b.writeUInt32LE(size, at + 16); b.writeUInt32LE(raw, at + 20);
  }
  section(sh, '.text', 4096, 512, 4096); section(sh + 40, '.rdata', 8192, 4608, 8192);
  const p = 5120, names = p + 72, tab = p + 512;
  Buffer.from('f1ffffff00000108', 'hex').copy(b, p);
  b.writeBigUInt64LE(1n, p + 8); b.writeBigUInt64LE(72n, p + 32); b.writeBigUInt64LE(512n, p + 64);
  b.write('google3/third_party/jetski/language_server/code_assist_client/codeassistclient.' +
    (wrongName ? 'unrelated' : '(*HostAuthProvider).GetTokenSource'), names);
  b.writeUInt32LE(0, tab); b.writeUInt32LE(24, tab + 4); b.writeUInt32LE(512, tab + 8);
  b.writeInt32LE(0, tab + 28);
  function load(at, value, target) {
    b.write(value, target); b.set([0x48, 0xc7, 0x84, 0x24, 0x18, 1, 0, 0], at - 12);
    b.writeUInt32LE(value.length, at - 4); b.set([0x48, 0x8d, 0x1d], at);
    const rva = badPointer ? 0x70000000 : 8192 + target - 4608;
    b.writeInt32LE(rva - (4096 + at - 512 + 7), at + 3);
    b.set([0x48, 0x89, 0x9c, 0x24], at + 7); b.writeInt32LE(0x110, at + 11);
  }
  load(544, id, 4640); load(608, secret, 4760);
  if (ambiguous) load(672, id.replace('a', 'c'), 4840);
  // An unrelated business client is deliberately present outside the selected method.
  b.write(id.replace('a', 'z'), 8000); b.write(secret.replace('b', 'x'), 8100);
  return b;
}
let serial = 0, passed = 0;
async function fixture({ client = true, mutate, extra = {}, packageText, binary, platform = 'win32' } = {}) {
  const root = join(temporary, String(++serial));
  const resources = platform === 'darwin' ? join(root, 'Contents', 'Resources') : join(root, 'resources');
  await mkdir(resources, { recursive: true });
  const executable = platform === 'darwin' ? join(root, 'Contents', 'MacOS', 'Antigravity') : join(root, platform === 'win32' ? 'Antigravity.exe' : 'antigravity');
  await mkdir(resolve(executable, '..'), { recursive: true }); await writeFile(executable, 'synthetic');
  const files = { 'package.json': packageText ?? JSON.stringify({ ...pkg, ...(client ? { antigravityOAuth: pair } : {}) }),
    'dist/main.js': '// Synthetic; never executed.', ...extra };
  if (binary) { files['dist/languageServer.js'] = 'const executable = "language_server";'; await mkdir(join(resources, 'bin')); await writeFile(join(resources, 'bin', 'language_server.exe'), binary); }
  const archive = join(resources, 'app.asar'); await writeFile(archive, asar(files, mutate));
  return { root, resources, archive, executable, options: { installPath: root, platform, cache: false } };
}
async function test(name, fn) { await fn(); passed++; console.log(`ok ${passed} - ${name}`); }
async function rejects(fn, code) {
  await assert.rejects(fn, e => e instanceof InstalledAgyError && e.code === code &&
    !e.message.includes(id) && !e.message.includes(secret) && !Object.hasOwn(e, 'cause'));
}
try {
  await test('explicit install / vendor-scoped ASAR schema / return shape', async () => {
    const f = await fixture(); const r = await discoverInstalledAgy(f.options);
    assert.deepEqual(Object.keys(r).sort(), ['clientId', 'clientSecret', 'installPath', 'sourcePath', 'version']);
    assert.equal(r.clientId, id); assert.equal(r.clientSecret, secret); assert.equal(r.version, pkg.version);
    assert.ok(r.sourcePath.endsWith('app.asar!/package.json'));
  });
  await test('missing installation, relative override, safe errors', async () => {
    await rejects(() => discoverInstalledAgy({ installPath: join(temporary, 'absent') }), 'INSTALL_NOT_FOUND');
    await rejects(() => discoverInstalledAgy({ installPath: 'relative' }), 'INVALID_INSTALL_PATH');
    assert.equal(new InstalledAgyError(secret).code, 'READ_FAILED');
  });
  await test('preserves Electron ASAR resolution during asynchronous discovery', async () => {
    const originalNoAsar = process.noAsar;
    const pending = discoverInstalledAgy({ installPath: join(temporary, 'absent-during-probe') });
    const during = process.noAsar;
    await rejects(() => pending, 'INSTALL_NOT_FOUND');
    assert.equal(during, originalNoAsar);
    assert.equal(process.noAsar, originalNoAsar);
  });
  await test('Windows LOCALAPPDATA auto-discovery and environment override', async () => {
    const f = await fixture(), local = join(temporary, 'local'), root = join(local, 'Programs', 'antigravity');
    await mkdir(join(local, 'Programs'), { recursive: true }); await symlink(f.root, root, 'junction');
    const r = await discoverInstalledAgy({ env: { LOCALAPPDATA: local }, platform: 'win32', cache: false }); assert.equal(r.clientId, id);
    assert.equal((await discoverInstalledAgy({ env: { AGY_NEXT_INSTALL_PATH: f.root }, platform: 'win32' })).version, pkg.version);
  });
  await test('multiple installations require an explicit override', async () => {
    const a = await fixture(), b = await fixture(), local = join(temporary, 'multi'), pf = join(temporary, 'program-files');
    await mkdir(join(local, 'Programs'), { recursive: true }); await mkdir(pf);
    await symlink(a.root, join(local, 'Programs', 'antigravity'), 'junction'); await symlink(b.root, join(pf, 'Antigravity'), 'junction');
    await rejects(() => discoverInstalledAgy({ env: { LOCALAPPDATA: local, ProgramFiles: pf }, platform: 'win32' }), 'AMBIGUOUS_INSTALL');
  });
  await test('macOS and Linux package layout discovery', async () => {
    for (const platform of ['darwin', 'linux']) { const f = await fixture({ platform }); assert.equal((await discoverInstalledAgy(f.options)).clientId, id); }
  });
  await test('reject wrong identity and version', async () => {
    for (const change of [{ name: 'other' }, { version: '1.99.0' }, { author: { name: 'Other' } }]) {
      const f = await fixture({ packageText: JSON.stringify({ ...pkg, ...change }) }); await rejects(() => discoverInstalledAgy(f.options), 'INVALID_IDENTITY');
    }
  });
  await test('generic and user-account-shaped clients are ignored', async () => {
    const f = await fixture({ client: false, extra: { 'dist/unrelated.json': JSON.stringify(pair), 'dist/account.json': '{"access_token":"not-read"}' } });
    await rejects(() => discoverInstalledAgy(f.options), 'CLIENT_NOT_FOUND');
  });
  await test('multiple explicit OAuth objects are ambiguous', async () => {
    const f = await fixture({ extra: { 'dist/oauth.json': JSON.stringify({ antigravityOAuth: pair }) } });
    await rejects(() => discoverInstalledAgy(f.options), 'AMBIGUOUS_CLIENT');
  });
  await test('duplicate JSON keys are rejected instead of shadowed', async () => {
    const f = await fixture({ packageText: JSON.stringify(pkg).replace('"name":', '"name":"other","name":') });
    await rejects(() => discoverInstalledAgy(f.options), 'INVALID_ASAR');
  });
  await test('short, malformed and oversized ASAR headers', async () => {
    for (const data of [Buffer.alloc(3), Buffer.alloc(16), Buffer.from('not-an-asar-header')]) {
      const f = await fixture(); await writeFile(f.archive, data); await rejects(() => discoverInstalledAgy(f.options), 'INVALID_ASAR');
    }
    const f = await fixture(); const b = asar({ 'package.json': '{}' }); b.writeUInt32LE(32 * 1024 * 1024, 4);
    await writeFile(f.archive, b); await rejects(() => discoverInstalledAgy(f.options), 'INVALID_ASAR');
  });
  await test('member bounds, overlap and unsafe offsets', async () => {
    for (const change of [h => h.files['package.json'].offset = '9999999999999999', h => h.files['package.json'].offset = '-1',
      h => h.files['package.json'].size = Number.MAX_SAFE_INTEGER, h => h.files.dist.files['main.js'].offset = '0']) {
      const f = await fixture({ mutate: change }); await rejects(() => discoverInstalledAgy(f.options), 'INVALID_ASAR');
    }
  });
  await test('ASAR traversal, links and oversized identity members', async () => {
    for (const change of [h => h.files['..'] = { size: 0, offset: '0' }, h => h.files['C:x'] = { size: 0, offset: '0' },
      h => h.files['linked'] = { link: 'package.json' }]) {
      const f = await fixture({ mutate: change }); await rejects(() => discoverInstalledAgy(f.options), 'UNSAFE_PATH');
    }
    const f = await fixture({ packageText: ' '.repeat(65537) }); await rejects(() => discoverInstalledAgy(f.options), 'FILE_LIMIT');
  });
  await test('ASAR unpacked identity is never followed', async () => {
    const f = await fixture({ mutate: h => h.files['package.json'].unpacked = true });
    await rejects(() => discoverInstalledAgy(f.options), 'INVALID_ASAR');
  });
  await test('cached discovery rechecks removal and changed identity', async () => {
    const f = await fixture(); const options = { ...f.options, cache: true };
    const first = await discoverInstalledAgy(options); first.clientId = 'mutated'; assert.equal((await discoverInstalledAgy(options)).clientId, id);
    await writeFile(f.archive, asar({ 'package.json': JSON.stringify({ ...pkg, name: 'other' }), 'dist/main.js': '' }));
    await rejects(() => discoverInstalledAgy(options), 'INVALID_IDENTITY');
    const g = await fixture(); await discoverInstalledAgy({ ...g.options, cache: true }); await rm(g.executable);
    await rejects(() => discoverInstalledAgy({ ...g.options, cache: true }), 'INSTALL_NOT_FOUND');
  });
  await test('PE Go method-scoped static client; unrelated business client ignored', async () => {
    const f = await fixture({ client: false, binary: native() }); const r = await discoverInstalledAgy(f.options);
    assert.equal(r.clientId, id); assert.equal(r.clientSecret, secret); assert.ok(r.sourcePath.endsWith('language_server.exe'));
  });
  await test('getOAuthConfig consumer client wins over HostAuthProvider; ambiguous consumers fail closed', async () => {
    const consumerId = '1071006060591-' + 'a'.repeat(32) + '.apps.googleusercontent.com';
    const consumerSecret = 'GOCSPX-' + 'e'.repeat(28);
    const businessId = '223456789012-' + 'c'.repeat(32) + '.apps.googleusercontent.com';
    const businessSecret = 'GOCSPX-' + 'c'.repeat(28);
    const otherId = '323456789012-' + 'd'.repeat(32) + '.apps.googleusercontent.com';
    const otherSecret = 'GOCSPX-' + 'd'.repeat(28);
    const hostName = 'google3/third_party/jetski/language_server/code_assist_client/codeassistclient.(*HostAuthProvider).GetTokenSource';
    const businessName = 'google3/third_party/jetski/language_server/auth_client/authclient.getOAuthConfig';
    function loadAt(b, at, value, target) {
      b.write(value, target); b.set([0x48, 0xc7, 0x84, 0x24, 0x18, 1, 0, 0], at - 12); b.writeUInt32LE(value.length, at - 4);
      b.set([0x48, 0x8d, 0x1d], at); b.writeInt32LE((8192 + target - 4608) - (4096 + at - 512 + 7), at + 3);
      b.set([0x48, 0x89, 0x9c, 0x24], at + 7); b.writeInt32LE(0x110, at + 11);
    }
    function methods(entries) {
      const b = Buffer.alloc(12800), pe = 128, opt = pe + 24, sh = opt + 240;
      b.write('MZ'); b.writeUInt32LE(pe, 60); b.writeUInt32LE(0x4550, pe); b.writeUInt16LE(0x8664, pe + 4);
      b.writeUInt16LE(2, pe + 6); b.writeUInt16LE(240, pe + 20); b.writeUInt16LE(0x20b, opt);
      b.write('.text', sh); b.writeUInt32LE(4096, sh + 12); b.writeUInt32LE(4096, sh + 16); b.writeUInt32LE(512, sh + 20);
      b.write('.rdata', sh + 40); b.writeUInt32LE(8192, sh + 52); b.writeUInt32LE(8192, sh + 56); b.writeUInt32LE(4608, sh + 60);
      const p = 6200, names = p + 72, tab = p + 1024;
      Buffer.from('f1ffffff00000108', 'hex').copy(b, p);
      b.writeBigUInt64LE(BigInt(entries.length), p + 8); b.writeBigUInt64LE(72n, p + 32); b.writeBigUInt64LE(1024n, p + 64);
      entries.forEach((entry, index) => {
        b.write(entry.name, names + entry.nameOff);
        b.writeUInt32LE(index * 512, tab + index * 8); b.writeUInt32LE(64 + index * 16, tab + index * 8 + 4);
        b.writeInt32LE(entry.nameOff, tab + 68 + index * 16);
        entry.loads.forEach((item) => loadAt(b, 512 + index * 512 + item.at, item.value, item.target));
      });
      b.writeUInt32LE(entries.length * 512, tab + entries.length * 8);
      return b;
    }
    const bothBinary = methods([
      { name: businessName, nameOff: 0, loads: [
        { at: 40, value: consumerId, target: 4640 }, { at: 104, value: consumerSecret, target: 4720 },
        { at: 168, value: businessId, target: 4800 }, { at: 232, value: businessSecret, target: 4880 },
      ] },
      { name: hostName, nameOff: 140, loads: [{ at: 40, value: id, target: 5000 }, { at: 104, value: secret, target: 5100 }] },
    ]);
    const both = await fixture({ client: false, binary: bothBinary });
    const selected = await discoverInstalledAgy(both.options);
    assert.equal(selected.clientId, consumerId); assert.equal(selected.clientSecret, consumerSecret);
    const ambiguousConsumer = await fixture({ client: false, binary: methods([
      { name: businessName, nameOff: 0, loads: [
        { at: 40, value: consumerId, target: 4640 }, { at: 104, value: consumerSecret, target: 4720 },
        { at: 168, value: '1071006060591-' + 'f'.repeat(32) + '.apps.googleusercontent.com', target: 4800 }, { at: 232, value: businessSecret, target: 4880 },
      ] },
      { name: hostName, nameOff: 140, loads: [{ at: 40, value: id, target: 5120 }, { at: 104, value: secret, target: 5220 }] },
    ]) });
    await rejects(() => discoverInstalledAgy(ambiguousConsumer.options), 'AMBIGUOUS_CLIENT');
    const crossed = await fixture({ client: false, binary: methods([
      { name: hostName, nameOff: 0, loads: [
        { at: 40, value: otherId, target: 4640 }, { at: 104, value: secret, target: 4720 },
        { at: 168, value: id, target: 4800 }, { at: 232, value: otherSecret, target: 4880 },
      ] },
    ]) });
    await rejects(() => discoverInstalledAgy(crossed.options), 'AMBIGUOUS_CLIENT');
    // Edge case: consumer client ID present but missing paired secret fails closed with AMBIGUOUS_CLIENT
    const missingSecret = await fixture({ client: false, binary: methods([
      { name: businessName, nameOff: 0, loads: [
        { at: 40, value: consumerId, target: 4640 },
        { at: 168, value: businessId, target: 4800 }, { at: 232, value: businessSecret, target: 4880 },
      ] },
      { name: hostName, nameOff: 140, loads: [{ at: 40, value: id, target: 5120 }, { at: 104, value: secret, target: 5220 }] },
    ]) });
    await rejects(() => discoverInstalledAgy(missingSecret.options), 'AMBIGUOUS_CLIENT');
  });
  await test('native ambiguity, bounds, missing method and malformed PE', async () => {
    for (const [binary, code] of [[native({ ambiguous: true }), 'AMBIGUOUS_CLIENT'], [native({ badPointer: true }), 'UNSUPPORTED_NATIVE'],
      [native({ wrongName: true }), 'CLIENT_NOT_FOUND'], [Buffer.alloc(16), 'UNSUPPORTED_NATIVE']]) {
      const f = await fixture({ client: false, binary }); await rejects(() => discoverInstalledAgy(f.options), code);
    }
  });
  await test('native section, Go table and method range bounds', async () => {
    for (const corrupt of [
      b => b.writeUInt32LE(0xffffffff, 60),
      b => b.writeUInt32LE(0xffffffff, 392 + 20),
      b => b.writeBigUInt64LE(300001n, 5120 + 8),
      b => b.writeBigUInt64LE(999999999n, 5120 + 64),
      b => b.writeUInt32LE(99999999, 5632 + 8),
    ]) {
      const binary = native(); corrupt(binary); const f = await fixture({ client: false, binary });
      await rejects(() => discoverInstalledAgy(f.options), 'UNSUPPORTED_NATIVE');
    }
  });
  await test('native file size cap and cache helper removal', async () => {
    const f = await fixture({ client: false, binary: native() }); const options = { ...f.options, cache: true };
    await discoverInstalledAgy(options); await rm(join(f.resources, 'bin', 'language_server.exe'));
    await rejects(() => discoverInstalledAgy(options), 'INSTALL_NOT_FOUND');
    const g = await fixture({ client: false, binary: native() }); await truncate(join(g.resources, 'bin', 'language_server.exe'), 256 * 1024 * 1024 + 1);
    await rejects(() => discoverInstalledAgy(g.options), 'FILE_LIMIT');
  });
  await test('unknown native platforms fail closed', async () => {
    const f = await fixture({ client: false, binary: native(), platform: 'linux' }); await rejects(() => discoverInstalledAgy(f.options), 'UNSUPPORTED_NATIVE');
  });
  console.log(`Passed ${passed} installed-Antigravity tests (synthetic fixtures only).`);
} finally {
  // The target is a verified, newly created temp directory, never a user install.
  // macOS resolves /var through /private/var, so compare canonical to canonical.
  assert.ok((await realpath(temporary)).startsWith(join(temporaryRoot, 'agy-installed-test-')));
  await cleanupFs.rm(temporary, { recursive: true, force: true });
}

