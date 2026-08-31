// ─────────────────────────────────────────────
// LanguageSelector
//
// Simple dropdown for English / हिंदी / मराठी.
// The chosen code ('en' | 'hi' | 'mr') is passed to /api/chat
// so the LLM responds in the user's language.
// ─────────────────────────────────────────────

import React from 'react';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'mr', label: 'मराठी' },
];

export default function LanguageSelector({ value, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-white text-gov-blue px-3 py-1.5 rounded-md text-sm font-medium
                 border border-white/30 focus:outline-none focus:ring-2 focus:ring-gov-orange"
      aria-label="Select response language"
    >
      {LANGUAGES.map((l) => (
        <option key={l.code} value={l.code}>
          {l.label}
        </option>
      ))}
    </select>
  );
}
