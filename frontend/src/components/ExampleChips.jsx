import React from 'react';

const SVG_ICONS = [
  // Registration Document Icon
  <svg key="1" className="w-4 h-4 text-[#a03612]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>,
  // Scales of Justice Icon
  <svg key="2" className="w-4 h-4 text-[#2d6a68]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l9-4 9 4v6c0 5.55-3.84 10.74-9 12-5.16-1.26-9-5.45-9-12V6z" />
  </svg>,
  // Ballot Box / Election Icon
  <svg key="3" className="w-4 h-4 text-[#a03612]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 012-2h10a2 2 0 012 2m-14 0v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
  </svg>,
  // Members / Group Icon
  <svg key="4" className="w-4 h-4 text-[#2d6a68]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
];

export default function ExampleChips({ questions, onSelect }) {
  const displayQuestions = (questions && questions.length >= 4) ? questions.slice(0, 4) : [
    'How to register a society?',
    'Rules for annual general meetings',
    'Election procedures',
    'Member rights and duties'
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto w-full my-6">
      {displayQuestions.map((q, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(q)}
          className="flex items-center gap-3.5 bg-white hover:bg-stone-50 border border-stone-200/90 hover:border-stone-300 text-stone-800 text-xs sm:text-sm font-semibold px-4 py-4 rounded-2xl shadow-soft hover:shadow-md transition-all duration-200 text-left group transform hover:-translate-y-0.5 active:translate-y-0 animate-slide-up"
          style={{ animationDelay: `${i * 0.08}s` }}
        >
          <span className="p-2 rounded-xl bg-stone-100/80 group-hover:bg-white group-hover:shadow-xs transition">
            {SVG_ICONS[i % SVG_ICONS.length]}
          </span>
          <span className="flex-1 leading-snug">{q}</span>
        </button>
      ))}
    </div>
  );
}
