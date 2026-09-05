// ─────────────────────────────────────────────
// Change-detection ("diff") engine, Module 2 of the data re-ingestion
// pipeline.
//
// On every monitoring run, each downloaded document in data/raw/ is
// MD5-hashed and compared against the stored hash in data/manifest.json:
//
//   unseen file  → recorded as "new" (baseline; not a change)
//   hash changed → document flagged "changed": moved to
//                  data/pending-ingestion/ for the future blue-green
//                  re-ingestion module (Module 3), manifest updated
//   hash same    → only last_checked is refreshed
//
// Manifest shape: { [ "<source_name>/<filename>"]: { source_name,
// filename, source_url, md5_hash, last_checked, last_changed } }
//
// NOTE: this module never triggers re-ingestion, it only detects and
// flags changes.
// ─────────────────────────────────────────────

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const MANIFEST_FILE = path.join(__dirname, '..', 'data', 'manifest.json');
export const RAW_DIR = path.join(__dirname, '..', 'data', 'raw');
export const PENDING_DIR = path.join(__dirname, '..', 'data', 'pending-ingestion');

/** MD5 of a file, streamed (documents can be large). */
export function computeMd5(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

function readManifest() {
  try {
    if (fs.existsSync(MANIFEST_FILE)) {
      const raw = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf-8'));
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw;
    }
  } catch (err) {
    console.warn('[diff] Manifest unreadable, starting fresh:', err.message);
  }
  return {};
}

function writeManifest(manifest) {
  fs.mkdirSync(path.dirname(MANIFEST_FILE), { recursive: true });
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf-8');
}

function timestampSlug(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

/**
 * Run change detection over everything currently in data/raw/.
 * Sources that failed scraping simply contribute no files, they are
 * absent from the scan, never treated as deletions.
 *
 * @param {Map<string,string>} [sourceUrls] optional map source_name → page URL,
 *        used to record provenance for newly seen files
 * @returns {{ scanned, new_docs: string[], changed: string[], unchanged: number, errors: string[] }}
 */
export async function detectChanges(sourceUrls = new Map()) {
  const manifest = readManifest();
  const result = {
    scanned: 0,
    new_docs: [],
    changed: [],
    unchanged: 0,
    errors: [],
  };

  if (!fs.existsSync(RAW_DIR)) {
    return result;
  }

  const now = new Date().toISOString();
  fs.mkdirSync(PENDING_DIR, { recursive: true });

  // One manifest key per source file, namespaced by source directory
  for (const sourceName of fs.readdirSync(RAW_DIR, { withFileTypes: true })) {
    if (!sourceName.isDirectory()) continue;
    const sourceDir = path.join(RAW_DIR, sourceName.name);

    for (const file of fs.readdirSync(sourceDir)) {
      const filePath = path.join(sourceDir, file);
      if (!fs.statSync(filePath).isFile()) continue;
      result.scanned += 1;

      const key = `${sourceName.name}/${file}`;
      try {
        const md5 = await computeMd5(filePath);
        const entry = manifest[key];

        if (!entry) {
          // First sighting, record the baseline, no change flag
          manifest[key] = {
            source_name: sourceName.name,
            filename: file,
            source_url: sourceUrls.get(sourceName.name) || '',
            md5_hash: md5,
            last_checked: now,
            last_changed: now,
          };
          result.new_docs.push(key);
          continue;
        }

        entry.last_checked = now;
        if (entry.md5_hash !== md5) {
          const oldHash = entry.md5_hash;
          // Amendment / notification change, move the new version out of
          // raw/ into pending-ingestion/ with a timestamp so successive
          // amendments never overwrite each other
          const pendingName = `${path.parse(file).name}__${timestampSlug()}${path.extname(file)}`;
          const pendingPath = path.join(PENDING_DIR, pendingName);
          if (fs.existsSync(pendingPath)) {
            result.errors.push(`pending file already exists: ${pendingName}`);
          } else {
            fs.renameSync(filePath, pendingPath);
          }
          entry.md5_hash = md5;
          entry.last_changed = now;
          entry.pending_file = `pending-ingestion/${pendingName}`;
          result.changed.push(key);
          console.log(`    ⚠ CHANGED: ${key} (md5 ${oldHash.slice(0, 8)}… → ${md5.slice(0, 8)}…)`);
        } else {
          result.unchanged += 1;
        }
      } catch (err) {
        result.errors.push(`${key}: ${err.message}`);
      }
    }
  }

  writeManifest(manifest);
  return result;
}
