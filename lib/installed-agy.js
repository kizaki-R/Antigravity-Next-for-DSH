/** Read installed, packaged application constants only. Never execute packaged code or read a profile.
 * options: { installPath?, env?, platform?, cache?: boolean, diagnose?: boolean }. An explicit path is an
 * install root (the .app bundle on macOS), not a profile, executable, or ASAR member. Errors never carry inputs.
 * ASAR schema: package identity + explicitly named antigravityOAuth object in app-owned JSON.
 * Observed 2.25.0 schema: getOAuthConfig contains the consumer client plus another client;
 * HostAuthProvider may hold a distinct client. Select the unique consumer ID and its aligned static secret.
 *
 * Two supported layouts, both official:
 *   desktop — `resources/app.asar` plus a packaged binary to fall back on
 *   IDE     — a VS Code fork: no ASAR, the client sits in `resources/app/out/main.js`
 * When both are present the desktop build wins: its archive schema has been stable for far longer
 * than a bundled JavaScript entry point, which the IDE may restructure in any release.
 */
const CONSUMER_CLIENT_ID_PREFIX = '1071006060591-';
const NATIVE_METHODS = [
  { name: 'google3/third_party/jetski/language_server/auth_client/authclient.getOAuthConfig', consumer: true },
  { name: 'google3/third_party/jetski/language_server/code_assist_client/codeassistclient.(*HostAuthProvider).GetTokenSource', consumer: false },
];
const GOOGLE_CLIENT_ID = /^[0-9]{8,30}-[A-Za-z0-9_-]{10,100}\.apps\.googleusercontent\.com$/;
const GOOGLE_CLIENT_SECRET = /^GOCSPX-[A-Za-z0-9_-]{28}$/;
/** IDE identity: the app folder is named this and so is the folder's package.json. */
const IDE_PRODUCT_NAME = 'Antigravity IDE';
/**
 * The IDE bundles its OAuth clients as adjacent string constants inside the
 * `cloudCode/common/oauthClient` module. Reading the whole ~14 MiB entry point
 * to find two literals is wasteful, so the search is anchored: locate the module
 * marker, then read forward from it. The first complete pair in that window is
 * the default (personal-account) client; a second pair, when present, belongs to
 * the enterprise/Google-Cloud flow and is not selected here.
 */
const IDE_MODULE_MARKER = 'cloudCode/common/oauthClient';
const IDE_MODULE_WINDOW = 64 * 1024;
const IDE_PAIR_GAP = /^["'\s,;)\]}]*[\w$]*["'\s]*[:=]\s*["']$/;
const MAX_IDE_BUNDLE = 64 * 1024 * 1024;
import { createRequire } from 'node:module';
import * as nodeFs from 'node:fs/promises';
import { join, resolve, relative, isAbsolute, sep } from 'node:path';

// Electron patches fs for ASAR paths; original-fs reads the archive file itself without process-global toggles.
const fileSystem = process.versions.electron === undefined
  ? nodeFs
  : createRequire(import.meta.url)('original-fs').promises;
const { open, stat, realpath } = fileSystem;

const messages = Object.freeze({
  INSTALL_NOT_FOUND: 'Official Antigravity installation is required.',
  INVALID_INSTALL_PATH: 'Antigravity install path must be an absolute directory.',
  INVALID_IDENTITY: 'Installed application identity is not supported Antigravity 2.',
  AMBIGUOUS_INSTALL: 'Multiple Antigravity installations were found; set AGY_NEXT_INSTALL_PATH.',
  INVALID_ASAR: 'Installed Antigravity ASAR is malformed or exceeds safety limits.',
  UNSAFE_PATH: 'Installed Antigravity contains an unsafe path or link.',
  FILE_LIMIT: 'Installed application file exceeds safety limits.',
  CLIENT_NOT_FOUND: 'No supported packaged Antigravity OAuth client was found.',
  AMBIGUOUS_CLIENT: 'Multiple packaged Antigravity OAuth clients match.',
  UNSUPPORTED_NATIVE: 'Packaged Antigravity helper layout is not supported.',
  READ_FAILED: 'Installed Antigravity could not be read safely.',
  IDE_CLIENT_UNREADABLE: 'Antigravity IDE was found, but its OAuth client could not be read. Install the desktop build instead, or report this problem.',
  IDE_IDENTITY_MISMATCH: 'An Antigravity IDE folder was found, but it is not the expected Antigravity IDE build.',
  IDE_CLIENT_AMBIGUOUS: 'Antigravity IDE exposes several OAuth clients and none could be chosen safely.',
});
export class InstalledAgyError extends Error {
  constructor(code = 'READ_FAILED') {
    const safe = typeof code === 'string' && Object.hasOwn(messages, code) ? code : 'READ_FAILED';
    super(messages[safe]); this.name = 'InstalledAgyError'; this.code = safe;
  }
}
const fail = code => { throw new InstalledAgyError(code); };
const record = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const integer = x => Number.isSafeInteger(x) && x >= 0;
function strictJson(text) {
  const value = JSON.parse(text); // Validate syntax before this bounded duplicate-key pass.
  const stack = [];
  for (const m of text.matchAll(/"(?:\\.|[^"\\])*"|[{}\[\],:]/g)) {
    if (stack.length > 128) fail('INVALID_ASAR');
    const t = m[0], top = stack.at(-1);
    if (t === '{') stack.push({ keys: new Set(), key: true });
    else if (t === '[') stack.push({});
    else if (t === '}' || t === ']') stack.pop();
    else if (t === ':' && top?.keys) top.key = false;
    else if (t === ',' && top?.keys) top.key = true;
    else if (t[0] === '"' && top?.key) {
      const key = JSON.parse(t);
      if (top.keys.has(key)) fail('INVALID_ASAR');
      top.keys.add(key);
    }
  }
  return value;
}
const MAX_HEADER = 16 * 1024 * 1024;
const MAX_ASAR = 512 * 1024 * 1024;
const MAX_NATIVE = 256 * 1024 * 1024;
const TTL = 5000;
// One entry: do not retain an unbounded collection of client secrets.
let cached;

function bounds(buffer, offset, size, code = 'UNSUPPORTED_NATIVE') {
  if (!integer(offset) || !integer(size) || offset > buffer.length || size > buffer.length - offset) fail(code);
}
async function exact(fd, size, position) {
  const buffer = Buffer.alloc(size);
  let done = 0;
  while (done < size) {
    const { bytesRead } = await fd.read(buffer, done, size - done, position + done);
    if (!bytesRead) fail('INVALID_ASAR');
    done += bytesRead;
  }
  return buffer;
}
async function contained(root, target) {
  const actual = await realpath(target);
  const rel = relative(root, actual);
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) fail('UNSAFE_PATH');
  return actual;
}
/** Read a small file that was already validated by regular(). */
async function readText(path) {
  const fd = await open(path, 'r');
  try {
    const s = await fd.stat();
    if (!s.isFile() || !integer(s.size) || s.size > 1024 * 1024) fail('FILE_LIMIT');
    return (await exact(fd, s.size, 0)).toString('utf8');
  } finally { await fd.close(); }
}
/**
 * Read the span of `path` around `marker` without loading the whole file.
 *
 * When the marker is absent the first `width` bytes are still returned, so a
 * caller can tell "marker moved" apart from "file unreadable" instead of
 * scanning megabytes to discover the bundle was restructured.
 */
async function readWindow(path, marker, width) {
  const fd = await open(path, 'r');
  try {
    const s = await fd.stat();
    if (!s.isFile() || !integer(s.size) || s.size > MAX_IDE_BUNDLE) fail('FILE_LIMIT');
    const size = Math.min(s.size, width);
    const start = (await exact(fd, size, 0)).toString('utf8');
    const at = start.indexOf(marker);
    if (at >= 0) return start.slice(at);
    // Not in the first window: stream forward in overlapping chunks. The marker
    // is ASCII and short, so an overlap of the marker length is enough to catch
    // one split across a boundary.
    const step = width;
    const overlap = marker.length + 1;
    for (let position = size - overlap; position < s.size; position += step - overlap) {
      const len = Math.min(step, s.size - position);
      if (len <= 0) break;
      const chunk = (await exact(fd, len, position)).toString('utf8');
      const hit = chunk.indexOf(marker);
      if (hit >= 0) return chunk.slice(hit);
    }
    return start;
  } finally { await fd.close(); }
}
async function regular(root, path, maximum) {
  const actual = await contained(root, path);
  const s = await stat(actual);
  if (!s.isFile()) fail('UNSAFE_PATH');
  if (!integer(s.size) || s.size > maximum) fail('FILE_LIMIT');
  return { actual, signature: `${s.dev}:${s.ino}:${s.size}:${s.mtimeMs}:${s.ctimeMs}` };
}

async function readAsar(path) {
  const fd = await open(path, 'r');
  try {
    const s = await fd.stat();
    if (!s.isFile() || s.size < 16 || s.size > MAX_ASAR) fail('INVALID_ASAR');
    const pre = await exact(fd, 16, 0);
    const headerSize = pre.readUInt32LE(4), payloadSize = pre.readUInt32LE(8), jsonSize = pre.readUInt32LE(12);
    // Chromium Pickle: outer uint32 pickle, inner length-prefixed UTF-8 string, 4-byte padding.
    if (pre.readUInt32LE(0) !== 4 || headerSize < 8 || headerSize > MAX_HEADER ||
        headerSize % 4 || payloadSize !== headerSize - 4 ||
        jsonSize < 2 || jsonSize > headerSize - 8 || headerSize - 8 - jsonSize > 3 ||
        headerSize > s.size - 8) fail('INVALID_ASAR');
    const start = 8 + headerSize;
    let header;
    try { header = strictJson((await exact(fd, jsonSize, 16)).toString('utf8')); }
    catch (e) { if (e instanceof InstalledAgyError) throw e; fail('INVALID_ASAR'); }
    const members = new Map(); let count = 0;
    function walk(node, prefix = '', depth = 0) {
      if (!record(node) || !record(node.files) || depth > 40) fail('INVALID_ASAR');
      for (const [name, entry] of Object.entries(node.files)) {
        if (++count > 50000 || !name || name === '.' || name === '..' || /[\\/:\x00-\x1f]/.test(name)) fail('UNSAFE_PATH');
        const member = prefix + name;
        if (member.length > 1024 || !record(entry)) fail('INVALID_ASAR');
        if (Object.hasOwn(entry, 'link')) fail('UNSAFE_PATH');
        if (Object.hasOwn(entry, 'files')) { walk(entry, member + '/', depth + 1); continue; }
        if (!integer(entry.size)) fail('INVALID_ASAR');
        if (entry.unpacked === true) { members.set(member, entry); continue; }
        if (entry.unpacked !== undefined && entry.unpacked !== false) fail('INVALID_ASAR');
        if (typeof entry.offset !== 'string' || !/^(0|[1-9][0-9]{0,15})$/.test(entry.offset)) fail('INVALID_ASAR');
        const offset = Number(entry.offset);
        if (!integer(offset) || offset > s.size - start || entry.size > s.size - start - offset) fail('INVALID_ASAR');
        members.set(member, { ...entry, offset });
      }
    }
    walk(header);
    const ranges = [...members.values()].filter(e => !e.unpacked && e.size).sort((a, b) => a.offset - b.offset);
    for (let i = 1; i < ranges.length; i++) {
      if (ranges[i].offset < ranges[i - 1].offset + ranges[i - 1].size) fail('INVALID_ASAR');
    }
    async function member(name, maximum = 1024 * 1024) {
      const entry = members.get(name);
      if (!entry || entry.unpacked) fail('INVALID_ASAR');
      if (entry.size > maximum) fail('FILE_LIMIT');
      return (await exact(fd, entry.size, start + entry.offset)).toString('utf8');
    }
    let pkg;
    try { pkg = strictJson(await member('package.json', 65536)); }
    catch (e) { if (e instanceof InstalledAgyError) throw e; fail('INVALID_IDENTITY'); }
    if (!record(pkg) || pkg.name !== 'antigravity' || pkg.productName !== 'Antigravity' ||
        typeof pkg.version !== 'string' || !/^2\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/.test(pkg.version) ||
        pkg.main !== 'dist/main.js' || !members.has(pkg.main) ||
        pkg.homepage !== 'https://antigravity.google' || pkg.author?.name !== 'Google') fail('INVALID_IDENTITY');
    const matches = [];
    // Explicit vendor-scoped objects only. Generic clientId/clientSecret elsewhere are unrelated.
    for (const name of ['package.json', 'dist/oauth.json', 'dist/auth/oauth.json']) {
      if (!members.has(name)) continue;
      let obj;
      try { obj = name === 'package.json' ? pkg : strictJson(await member(name, 65536)); }
      catch (e) { if (e instanceof InstalledAgyError) throw e; fail('INVALID_ASAR'); }
      if (record(obj?.antigravityOAuth)) {
        const { clientId, clientSecret } = obj.antigravityOAuth;
        if (validId(clientId) && validSecret(clientSecret)) matches.push({ clientId, clientSecret, sourcePath: `${path}!/${name}` });
      }
    }
    if (matches.length > 1) fail('AMBIGUOUS_CLIENT');
    // Verify this package actually references the expected helper before following the known path.
    const helperDeclared = members.has('dist/languageServer.js') &&
      /language_server/.test(await member('dist/languageServer.js', 1024 * 1024));
    return { version: pkg.version, match: matches[0], helperDeclared };
  } finally { await fd.close(); }
}
function validId(x) { return typeof x === 'string' && /^[0-9]{8,30}-[A-Za-z0-9_-]{10,100}\.apps\.googleusercontent\.com$/.test(x); }
function validSecret(x) { return typeof x === 'string' && /^GOCSPX-[A-Za-z0-9_-]{28}$/.test(x); }

/** Bounded PE+Go decoder, not a disassembler or a target-code loader.
 * Prefer the consumer HostAuthProvider method. A method is usable only when it
 * loads exactly one client id and one secret; multiple candidates are not paired
 * by scan order. getOAuthConfig is only a fallback when it has that same shape.
 */
function nativeClient(b) {
  const code = 'UNSUPPORTED_NATIVE';
  bounds(b, 0, 64);
  if (b.toString('ascii', 0, 2) !== 'MZ') fail(code);
  const pe = b.readUInt32LE(60); bounds(b, pe, 24);
  if (b.readUInt32LE(pe) !== 0x4550 || b.readUInt16LE(pe + 4) !== 0x8664) fail(code);
  const n = b.readUInt16LE(pe + 6), opt = pe + 24, optSize = b.readUInt16LE(pe + 20);
  if (n < 1 || n > 96 || optSize < 112) fail(code);
  bounds(b, opt, optSize + n * 40);
  if (b.readUInt16LE(opt) !== 0x20b) fail(code);
  const sections = [];
  for (let i = 0; i < n; i++) {
    const p = opt + optSize + i * 40;
    const section = { name: b.toString('ascii', p, p + 8).replace(/\0.*$/, ''),
      va: b.readUInt32LE(p + 12), size: b.readUInt32LE(p + 16), raw: b.readUInt32LE(p + 20) };
    bounds(b, section.raw, section.size); sections.push(section);
  }
  const text = sections.find(s => s.name === '.text'), data = sections.find(s => s.name === '.rdata');
  if (!text || !data) fail(code);
  const toFile = rva => {
    const s = sections.find(s => rva >= s.va && rva < s.va + s.size);
    return s ? s.raw + rva - s.va : -1;
  };
  const magic = Buffer.from('f1ffffff00000108', 'hex');
  const tables = []; let pos = data.raw - 1;
  while ((pos = b.indexOf(magic, pos + 1)) >= 0 && pos < data.raw + data.size) {
    if (pos + 72 <= data.raw + data.size) tables.push(pos);
  }
  if (tables.length !== 1) fail(code);
  const p = tables[0];
  const num = off => { bounds(b, p + off, 8); const x = b.readBigUInt64LE(p + off); if (x > BigInt(Number.MAX_SAFE_INTEGER)) fail(code); return Number(x); };
  const count = num(8), names = p + num(32), tab = p + num(64);
  if (!count || count > 300000) fail(code);
  bounds(b, names, 1); bounds(b, tab, (count + 1) * 8);
  let found;
  let sawUnpaired = false;
  for (const method of NATIVE_METHODS) {
    const { name: wanted } = method;
    let fnRange;
    for (let f = 0; f < count; f++) {
      const fn = tab + b.readUInt32LE(tab + f * 8 + 4); bounds(b, fn, 8);
      const np = names + b.readInt32LE(fn + 4); bounds(b, np, 1);
      if (np + wanted.length >= b.length || b[np + wanted.length] !== 0 ||
          b.toString('utf8', np, np + wanted.length) !== wanted) continue;
      const start = text.raw + b.readUInt32LE(tab + f * 8), finish = text.raw + b.readUInt32LE(tab + (f + 1) * 8);
      if (start < text.raw || finish > text.raw + text.size || finish <= start || finish - start > 65536) fail(code);
      fnRange = { start, finish };
      break;
    }
    if (!fnRange) continue;
    const ids = [], secrets = [];
    const { start, finish } = fnRange;
    for (let i = start; i < finish - 7; i++) {
      if ((b[i] === 0x48 || b[i] === 0x4c) && b[i + 1] === 0x8d && (b[i + 2] & 0xc7) === 5) {
        const isStringLoad =
          (i >= start + 12 && b[i - 12] === 0x48 && b[i - 11] === 0xc7) ||
          (i >= start + 8 && b[i - 8] === 0x48 && b[i - 7] === 0xc7);
        if (!isStringLoad) continue;
        const disp = b.readInt32LE(i + 3);
        const rip = text.va + i - text.raw + 7;
        const off = toFile(rip + disp);
        if (off < 0 || off < data.raw || off >= data.raw + data.size) fail(code);
        let end = off;
        while (end < data.raw + data.size && b[end] >= 0x20 && b[end] <= 0x7e && !/[\s"'<>{}|^`]/.test(String.fromCharCode(b[end]))) {
          end++;
        }
        let val = b.toString('ascii', off, end);
        if (val.includes('.apps.googleusercontent.com')) {
          const cut = val.indexOf('.apps.googleusercontent.com') + 27;
          val = val.slice(0, cut);
        } else if (val.startsWith('GOCSPX-')) {
          val = val.slice(0, 35);
        }
        if (validId(val) && !ids.includes(val)) ids.push(val);
        if (validSecret(val) && !secrets.includes(val)) secrets.push(val);
      }
    }
    if (method.consumer) {
      const consumerIndexes = ids.flatMap((value, index) => value.startsWith(CONSUMER_CLIENT_ID_PREFIX) ? [index] : []);
      // Go's getOAuthConfig may load both the consumer client and an unrelated
      // business client. Preserve the static-load order, but accept it only when
      // every ID has exactly one same-position secret and the consumer is unique.
      if (consumerIndexes.length > 1) fail('AMBIGUOUS_CLIENT');
      if (consumerIndexes.length === 1) {
        if (ids.length === secrets.length && secrets[consumerIndexes[0]]) {
          found = { clientId: ids[consumerIndexes[0]], clientSecret: secrets[consumerIndexes[0]] };
          break;
        }
        fail('AMBIGUOUS_CLIENT');
      }
      if (ids.length || secrets.length) sawUnpaired = true;
      continue;
    }
    if (ids.length === 1 && secrets.length === 1) {
      found = { clientId: ids[0], clientSecret: secrets[0] };
      break;
    }
    if (ids.length || secrets.length) sawUnpaired = true;
  }
  if (!found) fail(sawUnpaired ? 'AMBIGUOUS_CLIENT' : 'CLIENT_NOT_FOUND');
  return found;
}

function candidates(options) {
  const env = options.env ?? process.env, platform = options.platform ?? process.platform;
  const override = options.installPath ?? env.AGY_NEXT_INSTALL_PATH;
  if (override !== undefined && override !== '') {
    if (typeof override !== 'string' || !override.trim() || !isAbsolute(override.trim())) fail('INVALID_INSTALL_PATH');
    return { paths: [resolve(override.trim())], explicit: true, platform, desktop: [resolve(override.trim())], ide: [] };
  }
  let desktop, ide;
  if (platform === 'win32') {
    desktop = [env.LOCALAPPDATA && join(env.LOCALAPPDATA, 'Programs', 'antigravity'),
      ...[env.ProgramFiles, env['ProgramFiles(x86)']].filter(Boolean).flatMap(p => [join(p, 'Antigravity'), join(p, 'antigravity')])];
    ide = [env.LOCALAPPDATA && join(env.LOCALAPPDATA, 'Programs', IDE_PRODUCT_NAME),
      ...[env.ProgramFiles, env['ProgramFiles(x86)']].filter(Boolean).map(p => join(p, IDE_PRODUCT_NAME))];
  } else if (platform === 'darwin') {
    desktop = ['/Applications/Antigravity.app'];
    ide = ['/Applications/Antigravity IDE.app'];
  } else {
    desktop = ['/opt/Antigravity', '/opt/antigravity'];
    ide = ['/opt/Antigravity IDE', `/opt/${IDE_PRODUCT_NAME}`];
  }
  const clean = list => [...new Set(list.filter(p => p && isAbsolute(p)))];
  const desktopPaths = clean(desktop), idePaths = clean(ide);
  return { paths: [...desktopPaths, ...idePaths], explicit: false, platform, desktop: desktopPaths, ide: idePaths };
}

/**
 * Read one IDE install root far enough to prove it is the IDE and to recover
 * the default OAuth client. Returns null when the folder is not an IDE install.
 *
 * The identity check reads `resources/app/package.json`; the client search then
 * anchors on the oauthClient module marker inside `out/main.js` and reads only a
 * bounded window from there. A pair is accepted only when a secret literal
 * follows the client id through nothing but assignment punctuation, so two
 * clients in the same module can never be cross-paired.
 */
async function ideClient(root, platform) {
  const resources = platform === 'darwin' ? join(root, 'Contents', 'Resources') : join(root, 'resources');
  const app = join(resources, 'app');
  let manifest;
  try {
    const entry = await regular(root, join(app, 'package.json'), 1024 * 1024);
    manifest = strictJson(await readText(entry.actual));
  } catch (e) {
    if (e?.code === 'ENOENT' || e?.code === 'ENOTDIR') return null;
    if (e instanceof InstalledAgyError) fail('IDE_IDENTITY_MISMATCH');
    throw e;
  }
  if (!record(manifest) || manifest.name !== IDE_PRODUCT_NAME) fail('IDE_IDENTITY_MISMATCH');

  let bundle;
  try {
    bundle = await regular(root, join(app, 'out', 'main.js'), MAX_IDE_BUNDLE);
  } catch (e) {
    if (e?.code === 'ENOENT' || e?.code === 'ENOTDIR' || e instanceof InstalledAgyError) fail('IDE_CLIENT_UNREADABLE');
    throw e;
  }

  let window;
  try {
    window = await readWindow(bundle.actual, IDE_MODULE_MARKER, IDE_MODULE_WINDOW);
  } catch {
    fail('IDE_CLIENT_UNREADABLE');
  }

  // An anchored window with no marker means the bundle was restructured: report
  // that as unreadable rather than scanning the whole file and guessing.
  const marker = window.indexOf(IDE_MODULE_MARKER);
  if (marker < 0) fail('IDE_CLIENT_UNREADABLE');
  const body = window.slice(marker);

  const secrets = [...body.matchAll(/GOCSPX-[A-Za-z0-9_-]{28}/g)].map(m => ({ value: m[0], at: m.index }));
  const pairs = [];
  for (const m of body.matchAll(/([0-9]{8,30}-[A-Za-z0-9_-]{10,100})\.apps\.googleusercontent\.com/g)) {
    const end = m.index + m[0].length;
    const next = secrets.find(s => s.at >= end && s.at - end < 200);
    if (!next) continue;
    if (!IDE_PAIR_GAP.test(body.slice(end, next.at))) continue;
    pairs.push({ clientId: `${m[1]}.apps.googleusercontent.com`, clientSecret: next.value });
  }

  if (!pairs.length) fail('IDE_CLIENT_UNREADABLE');
  // Two distinct clients inside one module is expected (personal + enterprise).
  // More than two means the layout changed in a way this code cannot reason
  // about, so refuse instead of taking the first.
  const distinct = new Set(pairs.map(p => p.clientId));
  if (distinct.size > 2) fail('IDE_CLIENT_AMBIGUOUS');
  const chosen = pairs[0];
  if (!GOOGLE_CLIENT_ID.test(chosen.clientId) || !GOOGLE_CLIENT_SECRET.test(chosen.clientSecret)) fail('IDE_CLIENT_UNREADABLE');

  return {
    installPath: root,
    version: typeof manifest.version === 'string' ? manifest.version : '',
    clientId: chosen.clientId,
    clientSecret: chosen.clientSecret,
    sourcePath: `${join(app, 'out', 'main.js')}!/${IDE_MODULE_MARKER}`,
    kind: 'ide',
  };
}

/** @returns {Promise<{installPath:string,version:string,clientId:string,clientSecret:string,sourcePath:string,kind:'desktop'|'ide'}>} */
export async function discoverInstalledAgy(options = {}) {
  // Keep Electron's process-wide ASAR resolver unchanged across asynchronous filesystem work.
  try {
    const { paths, explicit, platform } = candidates(options);
    const installs = new Map();
    let ideSeen = null;
    for (const path of paths) {
      try {
        const root = await realpath(path);
        if (!(await stat(root)).isDirectory()) { if (explicit) fail('INVALID_INSTALL_PATH'); continue; }
        const resources = platform === 'darwin' ? join(root, 'Contents', 'Resources') : join(root, 'resources');
        const executable = platform === 'win32' ? join(root, 'Antigravity.exe') : platform === 'darwin' ?
          join(root, 'Contents', 'MacOS', 'Antigravity') : join(root, 'antigravity');
        const exe = await regular(root, executable, 512 * 1024 * 1024);
        const asar = await regular(root, join(resources, 'app.asar'), MAX_ASAR);
        installs.set(root, { root, resources, asar, exe });
      } catch (e) {
        if (e?.code === 'ENOENT' || e?.code === 'ENOTDIR') { if (explicit) fail('INSTALL_NOT_FOUND'); continue; }
        throw e;
      }
    }
    if (!installs.size) {
      // No desktop build. An IDE install is still usable: it packages the same
      // consumers' OAuth client as adjacent constants instead of an ASAR member.
      for (const path of paths) {
        let root;
        try {
          root = await realpath(path);
          if (!(await stat(root)).isDirectory()) continue;
        } catch { continue; }
        let found;
        try { found = await ideClient(root, platform); } catch (e) { found = e; }
        if (found === null) continue;
        if (found instanceof InstalledAgyError) {
          // Remember the first IDE failure and keep looking; a later install may
          // still work, and only total failure should surface the reason.
          ideSeen ??= found;
          continue;
        }
        if (options.cache !== false) cached = undefined;
        return { ...found };
      }
      cached = undefined;
      if (ideSeen) throw ideSeen;
      fail('INSTALL_NOT_FOUND');
    }
    if (installs.size !== 1) fail('AMBIGUOUS_INSTALL');
    const install = [...installs.values()][0];
    const { root, resources, asar, exe } = install;
    // Check all files used by the cached discovery, every call (including native helper removal).
    let helper;
    if (cached?.root === root && cached.nativePath) helper = await regular(root, cached.nativePath, MAX_NATIVE);
    const signature = `${asar.signature}:${exe.signature}:${helper?.signature ?? ''}`;
    if (options.cache !== false && cached?.root === root && cached.signature === signature && cached.expires > Date.now()) {
      return { ...cached.value };
    }
    cached = undefined;
    const archive = await readAsar(asar.actual);
    let result = archive.match, nativePath;
    if (!result) {
      if (!archive.helperDeclared) fail('CLIENT_NOT_FOUND');
      if (platform !== 'win32') fail('UNSUPPORTED_NATIVE');
      nativePath = join(resources, 'bin', 'language_server.exe');
      try { helper = await regular(root, nativePath, MAX_NATIVE); }
      catch (e) { if (e?.code === 'ENOENT') fail('CLIENT_NOT_FOUND'); throw e; }
      const fd = await open(helper.actual, 'r');
      try {
        const s = await fd.stat();
        if (!s.isFile() || s.size > MAX_NATIVE) fail('FILE_LIMIT');
        result = { ...nativeClient(await exact(fd, s.size, 0)), sourcePath: helper.actual };
      } finally { await fd.close(); }
    }
    const value = { installPath: root, version: archive.version, ...result, kind: 'desktop' };
    if (options.cache !== false) cached = { root, nativePath, signature: `${asar.signature}:${exe.signature}:${helper?.signature ?? ''}`, expires: Date.now() + TTL, value };
    return { ...value };
  } catch (e) {
    if (e instanceof InstalledAgyError) throw e;
    if (e?.code === 'ENOENT' || e?.code === 'ENOTDIR') { cached = undefined; fail('INSTALL_NOT_FOUND'); }
    fail('READ_FAILED');
  }
}
