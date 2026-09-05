// ─────────────────────────────────────────────
// Privacy-First Geolocation Endpoint (GET /api/geo/detect-state)
//
// Detects client's Indian state to suggest (NOT auto-assume) relevant
// cooperative society laws.
//
// PRIVACY RULE:
// The raw IP address is NEVER logged, stored in databases, or sent to
// LLMs. It is only processed in transient memory to extract the region
// name, then immediately discarded.
// ─────────────────────────────────────────────

import express from 'express';
import axios from 'axios';

const router = express.Router();

const STATE_MAPPING = {
  'maharashtra': 'Maharashtra',
  'gujarat': 'Gujarat',
  'karnataka': 'Karnataka',
  'delhi': 'Delhi',
  'national capital territory of delhi': 'Delhi',
  'rajasthan': 'Rajasthan',
  'tamil nadu': 'Tamil Nadu',
  'telangana': 'Telangana',
  'andhra pradesh': 'Andhra Pradesh',
  'kerala': 'Kerala',
  'madhya pradesh': 'Madhya Pradesh',
  'uttar pradesh': 'Uttar Pradesh',
  'west bengal': 'West Bengal',
  'punjab': 'Punjab',
  'haryana': 'Haryana',
  'goa': 'Goa',
  'bihar': 'Bihar',
  'odisha': 'Odisha',
};

function normalizeState(rawRegion = '') {
  if (!rawRegion || typeof rawRegion !== 'string') return null;
  const key = rawRegion.trim().toLowerCase();
  return STATE_MAPPING[key] || rawRegion.trim();
}

router.get('/detect-state', async (req, res) => {
  try {
    // Extract IP from headers or socket
    let clientIp = req.headers['x-forwarded-for']
      ? req.headers['x-forwarded-for'].split(',')[0].trim()
      : (req.socket?.remoteAddress || '');

    // Clean IPv6 IPv4-mapped prefix
    if (clientIp.startsWith('::ffff:')) {
      clientIp = clientIp.replace('::ffff:', '');
    }

    const isLocal = !clientIp ||
      clientIp === '::1' ||
      clientIp === '127.0.0.1' ||
      clientIp.startsWith('192.168.') ||
      clientIp.startsWith('10.') ||
      clientIp.startsWith('172.16.') ||
      clientIp.startsWith('fc00:') ||
      clientIp.startsWith('fe80:');

    // If local development, query public IP or provide default suggestion
    let geoUrl = 'http://ip-api.com/json/?fields=status,country,countryCode,regionName,city';
    if (!isLocal) {
      geoUrl = `http://ip-api.com/json/${clientIp}?fields=status,country,countryCode,regionName,city`;
    }

    let detectedState = 'Maharashtra';
    let isDefault = true;
    let city = '';
    let country = 'India';

    try {
      const response = await axios.get(geoUrl, { timeout: 3000 });
      if (response.data && response.data.status === 'success') {
        const normalized = normalizeState(response.data.regionName);
        if (normalized) {
          detectedState = normalized;
          isDefault = false;
        }
        city = response.data.city || '';
        country = response.data.country || 'India';
      }
    } catch (err) {
      // Fallback if external geo service is unreachable or rate limited
      console.warn('[geo] Geolocation lookup failed or timed out:', err.message);
    }

    // IP is now out of scope and will be garbage-collected
    return res.json({
      state: detectedState,
      detectedState,
      isDefault,
      city,
      country,
    });
  } catch (err) {
    console.error('[geo] Unexpected error in detect-state:', err.message);
    return res.json({
      state: 'Maharashtra',
      detectedState: 'Maharashtra',
      isDefault: true,
      country: 'India',
    });
  }
});

export default router;
