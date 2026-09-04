// ─────────────────────────────────────────────
// Government source scraper — Module 2 of the data re-ingestion pipeline.
//
// For every enabled source in data/sources.json:
//   1. Fetch the configured HTML page (axios, polite User-Agent).
//   2. Extract every PDF link via cheerio.
//   3. Download each PDF to data/raw/{source_name}/.
//
// All outbound requests pass through a process-wide rate limiter
// (max 1 request / 2 seconds) so government portals are never hammered.
//
// This module only downloads — change detection & flagging live in
// services/diffEngine.js, and re-ingestion is a later (blue-green) module.
// ─────────────────────────────────────────────

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import * as cheerio from 'cheerio';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const RAW_DIR = path.join(__dirname, '..', 'data', 'raw');
export const SOURCES_FILE = path.join(__dirname, '..', 'data', 'sources.json');

const REQUEST_GAP_MS = parseInt(process.env.SCRAPER_REQUEST_GAP_MS || '2000', 10);
const PAGE_TIMEOUT_MS = 20_000;
const DOWNLOAD_TIMEOUT_MS = 120_000;
const MAX_DOWNLOAD_BYTES = 100 * 1024 * 1024; // 100 MB safety cap

const USER_AGENT = 'SahakarMitraLegalBot/1.0 (academic legal-awareness project; updates monitored for public benefit)';

// ── Process-wide rate limiter: ≥ REQUEST_GAP_MS between outbound requests ──
let lastRequestAt = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function rateLimitedWait() {
  const now = Date.now();
  const wait = lastRequestAt + REQUEST_GAP_MS - now;
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
}

async function fetchPage(url) {
  await rateLimitedWait();
  const res = await axios.get(url, {
    timeout: PAGE_TIMEOUT_MS,
    maxRedirects: 5,
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' },
    responseType: 'text', // leave the HTML body unparsed
  });
  return res.data;
}

// ── PDF link extraction ─────────────────────────────────────────

function sanitizeFilename(name) {
  return name.replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 150) || 'document.pdf';
}

function filenameFromUrl(url) {
  try {
    const { pathname } = new URL(url);
    const base = decodeURIComponent(pathname.split('/').filter(Boolean).pop() || '');
    return sanitizeFilename(base || 'document.pdf');
  } catch {
    return sanitizeFilename(url);
  }
}

/**
 * Extract absolute PDF links from an HTML page.
 * Returns deduplicated [{ url, text }] in document order.
 */
export function extractPdfLinks(html, baseUrl) {
  const $ = cheerio.load(html);
  const seen = new Set();
  const links = [];

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    const trimmed = href.trim();
    if (!/\.pdf(\?|#|$)/i.test(trimmed)) return;

    let absolute;
    try {
      absolute = new URL(trimmed, baseUrl).toString();
    } catch {
      return; // malformed href — skip
    }
    if (seen.has(absolute)) return;
    seen.add(absolute);
    links.push({ url: absolute, text: ($(el).text() || '').trim().slice(0, 120) });
  });

  return links;
}

// ── Downloading ─────────────────────────────────────────────────

async function downloadPdf(url, destPath) {
  await rateLimitedWait();
  const res = await axios.get(url, {
    timeout: DOWNLOAD_TIMEOUT_MS,
    maxRedirects: 5,
    responseType: 'arraybuffer',
    headers: { 'User-Agent': USER_AGENT },
    maxContentLength: MAX_DOWNLOAD_BYTES,
  });

  const buf = Buffer.from(res.data);
  // Cheap sanity check: a truncated HTML error page shouldn't land in raw/
  const head = buf.subarray(0, 1024).toString('latin1');
  if (!head.startsWith('%PDF-') && !head.includes('%PDF-')) {
    throw new Error('Response is not a PDF (missing %PDF- header)');
  }
  fs.writeFileSync(destPath, buf);
  return buf.length;
}

/**
 * Scrape one source: fetch its page(s), download every linked PDF
 * into data/raw/{source.name}/.
 * Never throws — failures are captured in the returned summary.
 * @returns {{ source, ok, pages, pdf_links, downloaded, failed, errors: string[] }}
 */
export async function scrapeSource(source) {
  const summary = {
    source: source.name,
    url: source.url,
    ok: false,
    pages: 0,
    pdf_links: 0,
    downloaded: 0,
    skipped_existing: 0,
    failed: 0,
    errors: [],
    files: [],
  };

  try {
    const html = await fetchPage(source.url);
    summary.pages = 1;
    const links = extractPdfLinks(html, source.url);
    summary.pdf_links = links.length;

    const destDir = path.join(RAW_DIR, sanitizeFilename(source.name));
    fs.mkdirSync(destDir, { recursive: true });

    for (const link of links) {
      const filename = filenameFromUrl(link.url);
      const destPath = path.join(destDir, filename);
      try {
        const size = await downloadPdf(link.url, destPath);
        summary.downloaded += 1;
        summary.files.push({ filename, url: link.url, size, title: link.text });
        console.log(`    ↓ ${filename} (${(size / 1024).toFixed(0)} KB)`);
      } catch (err) {
        summary.failed += 1;
        summary.errors.push(`download ${link.url}: ${err.message}`);
        console.warn(`    ✗ download failed: ${filename} — ${err.message}`);
      }
    }

    summary.ok = true;
  } catch (err) {
    summary.errors.push(`page fetch: ${err.message}`);
    console.warn(`    ✗ source unreachable: ${err.message}`);
  }

  return summary;
}

/**
 * Scrape all enabled sources. One source failing never blocks the rest.
 * @param {Array<{name,url,enabled}>} [sources] defaults to data/sources.json
 */
export async function scrapeAllSources(sources) {
  if (!sources) {
    const config = JSON.parse(fs.readFileSync(SOURCES_FILE, 'utf-8'));
    sources = (config.sources || []).filter((s) => s.enabled);
  }

  console.log(`Scraping ${sources.length} enabled source(s) (max 1 request / ${(REQUEST_GAP_MS / 1000).toFixed(1)}s)...`);
  const summaries = [];
  for (const source of sources) {
    console.log(`  ▶ ${source.name}: ${source.url}`);
    summaries.push(await scrapeSource(source));
  }
  return summaries;
}
