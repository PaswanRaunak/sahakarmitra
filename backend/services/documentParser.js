// ─────────────────────────────────────────────
// Document Parser service — extracts readable text from user attachments:
//   - Images / Screenshots (PNG, JPG, WEBP, etc.) via OCR (Tesseract.js)
//   - PDF documents via PDFParse (pdfjs-dist engine)
//   - Text / Markdown / CSV / JSON files via UTF-8 decoder
// ─────────────────────────────────────────────

import { PDFParse } from 'pdf-parse';
import { createWorker } from 'tesseract.js';

let ocrWorker = null;

async function getOcrWorker() {
  if (!ocrWorker) {
    ocrWorker = await createWorker('eng');
  }
  return ocrWorker;
}

/**
 * Strip base64 metadata header if present (e.g. "data:image/png;base64,...")
 */
function getRawBase64(dataStr) {
  if (!dataStr) return '';
  const commaIdx = dataStr.indexOf(',');
  if (commaIdx !== -1 && dataStr.slice(0, commaIdx).includes('base64')) {
    return dataStr.slice(commaIdx + 1);
  }
  return dataStr;
}

/**
 * Robust PDF text extraction using PDFParse engine.
 */
async function extractTextFromPdf(buffer) {
  let parser = null;
  try {
    parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    const text = (result?.text || '').trim();
    const numPages = result?.total || result?.pages?.length || 1;
    return {
      text: text || '[PDF document contains no selectable text or is a scanned image]',
      numPages,
    };
  } catch (err) {
    console.warn('[parser] PDFParse error:', err.message);
    throw new Error(`Failed to extract text from PDF: ${err.message}`);
  } finally {
    if (parser && typeof parser.destroy === 'function') {
      try {
        await parser.destroy();
      } catch {}
    }
  }
}

/**
 * Extract text from a single attachment.
 * @param {Object} file - { name, type, data, size }
 */
export async function parseAttachment(file) {
  if (!file || !file.data) {
    return { name: file?.name || 'unknown', extractedText: '', isImage: false };
  }

  const name = file.name || 'document';
  const type = (file.type || '').toLowerCase();
  const ext = name.split('.').pop()?.toLowerCase() || '';

  const rawBase64 = getRawBase64(file.data);
  const buffer = Buffer.from(rawBase64, 'base64');

  // 1. Image / Screenshot OCR
  const isImage = type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'].includes(ext);
  if (isImage) {
    try {
      console.log(`[parser] Performing OCR on image: ${name} (${(buffer.length / 1024).toFixed(1)} KB)...`);
      const worker = await getOcrWorker();
      const ret = await worker.recognize(buffer);
      const text = (ret.data?.text || '').trim();
      console.log(`[parser] OCR complete for ${name}. Extracted ${text.length} characters.`);
      return {
        name,
        type: type || 'image',
        isImage: true,
        extractedText: text || '[Image processed: No clear text detected]',
        charCount: text.length,
      };
    } catch (err) {
      console.warn(`[parser] OCR failed for image ${name}:`, err.message);
      return {
        name,
        type: type || 'image',
        isImage: true,
        extractedText: `[Image attachment: OCR processing encountered an issue: ${err.message}]`,
        charCount: 0,
      };
    }
  }

  // 2. PDF Document
  const isPdf = type === 'application/pdf' || ext === 'pdf';
  if (isPdf) {
    try {
      console.log(`[parser] Parsing PDF document: ${name} (${(buffer.length / 1024).toFixed(1)} KB)...`);
      const { text, numPages } = await extractTextFromPdf(buffer);
      console.log(`[parser] PDF parsed for ${name}. Extracted ${text.length} characters across ${numPages} page(s).`);
      return {
        name,
        type: 'application/pdf',
        isImage: false,
        extractedText: text,
        charCount: text.length,
        numPages,
      };
    } catch (err) {
      console.warn(`[parser] PDF parsing failed for ${name}:`, err.message);
      return {
        name,
        type: 'application/pdf',
        isImage: false,
        extractedText: `[PDF parsing notice: ${err.message}]`,
        charCount: 0,
      };
    }
  }

  // 3. Plain Text / Markdown / CSV / JSON / Code
  try {
    const text = buffer.toString('utf-8').trim();
    return {
      name,
      type: type || 'text/plain',
      isImage: false,
      extractedText: text,
      charCount: text.length,
    };
  } catch (err) {
    return {
      name,
      type: 'unknown',
      isImage: false,
      extractedText: '[Unable to decode text content]',
      charCount: 0,
    };
  }
}

/**
 * Parse an array of attachments in parallel.
 * Returns combined text and per-attachment summary.
 */
export async function parseAllAttachments(attachments = []) {
  if (!Array.isArray(attachments) || attachments.length === 0) {
    return { combinedText: '', parsedFiles: [] };
  }

  const results = await Promise.all(
    attachments.map(att => parseAttachment(att))
  );

  const combinedText = results
    .map((res, i) => {
      const header = `=== ATTACHMENT ${i + 1}: ${res.name} (${res.isImage ? 'Screenshot/Image OCR' : 'Document PDF/Text'}) ===`;
      return `${header}\n${res.extractedText}\n=================================================`;
    })
    .join('\n\n');

  return {
    combinedText,
    parsedFiles: results,
  };
}
