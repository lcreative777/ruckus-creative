// scripts/mux-renditions.mjs
//
// Ask Mux to encode static MP4 renditions of the homepage hero asset, so the
// hero can be a plain <video> instead of an HLS stream driven by hls.js.
// Dropping hls.js takes ~177 KB gzipped off the homepage.
//
// Mux encodes these from the asset that is already uploaded — nothing is
// re-uploaded, and all renditions share the existing playback ID:
//   https://stream.mux.com/{PLAYBACK_ID}/{RESOLUTION}.mp4
//
// Mux never upscales. This asset's source tops out at 720p, so 720p and 480p
// encode and anything above is refused — which is why 1080p.mp4 and up 404
// while highest.mp4 (21 MB) does not. 21 MB is far too heavy for a looping
// muted background, hence --delete-highest.
//
// Usage:
//   node scripts/mux-renditions.mjs                  # create 720p + 480p, then poll
//   node scripts/mux-renditions.mjs --status         # report only, change nothing
//   node scripts/mux-renditions.mjs --delete-highest # also remove the 21 MB one
//
// Reads credentials from ./mux.txt (gitignored) or MUX_TOKEN_ID / MUX_TOKEN_SECRET.
// Generate a token at Mux dashboard -> Settings -> Access Tokens, with at least
// "Mux Video" read+write permission.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const ASSET_ID = 'm7EsanTCtd29dB3RUqD6ivcCYFmozTWhS3t45qEOSC4';
const PLAYBACK_ID = 'x8Dj7cq01zoZ4SRWJdrvoUWEpwVj7L5g5wBr01vBe40288';
const WANT = ['720p', '480p'];
const API = 'https://api.mux.com/video/v1';

const args = process.argv.slice(2);
const STATUS_ONLY = args.includes('--status');
const DELETE_HIGHEST = args.includes('--delete-highest');

/** `--delete 720p,480p` or `--delete=720p,480p`. Deletes, then stops. */
const DELETE_NAMES = (() => {
  const i = args.findIndex(a => a === '--delete' || a.startsWith('--delete='));
  if (i === -1) return null;
  const raw = args[i].includes('=') ? args[i].split('=')[1] : args[i + 1];
  return raw ? raw.split(',').map(s => s.trim()).filter(Boolean) : null;
})();

const ROOT = new URL('..', import.meta.url).pathname;

/**
 * Accepts whatever shape the dashboard copy/paste lands in: `KEY=value`,
 * `Key: value`, or a label line followed by the value on the next line.
 */
async function credentials() {
  if (process.env.MUX_TOKEN_ID && process.env.MUX_TOKEN_SECRET) {
    return { id: process.env.MUX_TOKEN_ID.trim(), secret: process.env.MUX_TOKEN_SECRET.trim() };
  }

  let text;
  try {
    text = await readFile(join(ROOT, 'mux.txt'), 'utf8');
  } catch {
    throw new Error(
      'No MUX_TOKEN_ID / MUX_TOKEN_SECRET set and mux.txt not found.\n' +
      'Create mux.txt in the project root (it is gitignored) containing:\n' +
      '  MUX_TOKEN_ID=...\n  MUX_TOKEN_SECRET=...',
    );
  }

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const find = (re) => {
    for (let i = 0; i < lines.length; i++) {
      const inline = lines[i].match(new RegExp(`^${re}\\s*[:=]\\s*(.+)$`, 'i'));
      if (inline) return inline[1].trim().replace(/^["']|["']$/g, '');
      // Label alone on its line, value on the next.
      if (new RegExp(`^${re}$`, 'i').test(lines[i]) && lines[i + 1]) return lines[i + 1];
    }
    return null;
  };

  const id = find('MUX_TOKEN_ID') ?? find('(?:access )?token id');
  const secret = find('MUX_TOKEN_SECRET') ?? find('(?:access )?token secret') ?? find('secret key');
  if (!id || !secret) {
    throw new Error('Could not find both a token ID and a token secret in mux.txt.');
  }
  return { id, secret };
}

async function mux(path, { method = 'GET', body, auth } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${auth.id}:${auth.secret}`).toString('base64')}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const detail = json?.error?.messages?.join('; ') ?? json?.error?.type ?? text.slice(0, 300);
    const err = new Error(`Mux ${res.status} on ${method} ${path}: ${detail}`);
    err.status = res.status;
    throw err;
  }
  return json.data;
}

/** Mux has shipped this as both a bare array and an object with `.files`. */
const renditionsOf = (asset) => {
  const sr = asset.static_renditions;
  if (!sr) return [];
  return Array.isArray(sr) ? sr : (sr.files ?? []);
};

const nameOf = (r) => r.resolution ?? r.name?.replace(/\.\w+$/, '') ?? r.name ?? '?';

async function report(auth) {
  const asset = await mux(`/assets/${ASSET_ID}`, { auth });
  const list = renditionsOf(asset);
  console.log(`\nAsset ${ASSET_ID}`);
  console.log(`  status:   ${asset.status}`);
  console.log(`  duration: ${asset.duration ? `${asset.duration.toFixed(1)}s` : 'unknown'}`);
  console.log(`  max res:  ${asset.max_stored_resolution ?? 'unknown'}`);
  if (!list.length) {
    console.log('  static renditions: none');
    return { asset, list };
  }
  console.log('  static renditions:');
  for (const r of list) {
    const mb = r.filesize ? ` ${(Number(r.filesize) / 1048576).toFixed(1)} MB` : '';
    console.log(`    ${String(nameOf(r)).padEnd(10)} ${String(r.status ?? '?').padEnd(10)}${mb}`);
  }
  return { asset, list };
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const auth = await credentials();
let { list } = await report(auth);

if (STATUS_ONLY) process.exit(0);

// --- Explicit deletions ----------------------------------------------------
// Measured 2026-08-16: the static MP4s encode at the same bitrates as the HLS
// rungs (720p 2.29 vs 2.32 Mbps, 480p 1.07 vs 1.14), so they buy no bytes —
// they only give up adaptive bitrate and segmented delivery. The hero stays on
// HLS, and this removes the renditions so they aren't billed as storage.
// Deletes and stops; it never falls through to the create step below.
if (DELETE_NAMES) {
  for (const name of DELETE_NAMES) {
    const r = list.find(x => nameOf(x) === name || x.name === `${name}.mp4`);
    if (!r) { console.log(`\n${name}: not present.`); continue; }
    if (!r.id) { console.log(`\n${name}: no id returned; delete it from the dashboard.`); continue; }
    await mux(`/assets/${ASSET_ID}/static-renditions/${r.id}`, { method: 'DELETE', auth });
    const mb = r.filesize ? ` (${(Number(r.filesize) / 1048576).toFixed(1)} MB reclaimed)` : '';
    console.log(`\n${name}: deleted${mb}.`);
  }
  await report(auth);
  process.exit(0);
}

// --- Drop the legacy whole-asset MP4 first ---------------------------------
// This has to come BEFORE the creates, not after: Mux rejects the per-
// resolution ("advanced") static renditions with
//   400 Advanced static rendition not supported with highest enabled
// while the legacy `highest` rendition is on the asset. Deleting it is safe
// for the live site, which plays HLS and never requests highest.mp4.
if (DELETE_HIGHEST) {
  const highest = list.find(r => nameOf(r) === 'highest' || r.name === 'highest.mp4');
  if (!highest) {
    console.log('\nhighest: not present, nothing to delete.');
  } else if (!highest.id) {
    console.log('\nhighest: present but the API returned no id for it; delete it from the dashboard.');
  } else {
    await mux(`/assets/${ASSET_ID}/static-renditions/${highest.id}`, { method: 'DELETE', auth });
    console.log('\nhighest: deleted (21 MB reclaimed).');
    // Re-read, so the create loop below sees the asset without `highest`.
    list = renditionsOf(await mux(`/assets/${ASSET_ID}`, { auth }));
  }
}

// --- Create the two we actually want to serve ------------------------------
let pending = 0;
for (const resolution of WANT) {
  if (list.some(r => nameOf(r) === resolution)) {
    console.log(`\n${resolution}: already requested, skipping.`);
    pending++;
    continue;
  }
  try {
    await mux(`/assets/${ASSET_ID}/static-renditions`, {
      method: 'POST', auth, body: { resolution },
    });
    console.log(`\n${resolution}: requested.`);
    pending++;
  } catch (err) {
    // A resolution above the source is refused rather than upscaled.
    console.error(`\n${resolution}: ${err.message}`);
    // Reading an asset needs only read permission; creating a rendition needs
    // write. A read-only token therefore gets a working --status and a 401
    // here — worth calling out, because the cause is not obvious.
    if (err.status === 401) {
      console.error(
        '\nThis token can read the asset but not modify it. Regenerate it at\n' +
        'Mux dashboard -> Settings -> Access Tokens with "Mux Video: Read and Write",\n' +
        'then update mux.txt.',
      );
      process.exit(1);
    }
  }
}

if (!pending) {
  console.error('\nNo renditions were created or pending — nothing to wait for.');
  process.exit(1);
}

// --- Poll until the new renditions finish encoding -------------------------
console.log('\nWaiting for encoding (checking every 15s, up to 10 min)...');
for (let i = 0; i < 40; i++) {
  await sleep(15_000);
  const asset = await mux(`/assets/${ASSET_ID}`, { auth });
  list = renditionsOf(asset);
  const mine = list.filter(r => WANT.includes(nameOf(r)));
  const done = mine.filter(r => r.status === 'ready');
  console.log(`  ${done.map(nameOf).join(', ') || '—'} ready of ${mine.map(nameOf).join(', ') || '—'}`);
  if (mine.length && done.length === mine.length) break;
  if (mine.some(r => r.status === 'errored')) {
    console.error('  a rendition errored — see the Mux dashboard.');
    break;
  }
}

await report(auth);
console.log('\nURLs:');
for (const r of WANT) console.log(`  https://stream.mux.com/${PLAYBACK_ID}/${r}.mp4`);
