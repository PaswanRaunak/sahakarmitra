/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Semantic tokens -> CSS variables (tokens.css, Forest family).
        // Alpha modifiers work: bg-surface/80 etc.
        surface:  'rgb(var(--c-surface) / <alpha-value>)',
        elevated: 'rgb(var(--c-elevated) / <alpha-value>)',
        sunken:   'rgb(var(--c-sunken) / <alpha-value>)',
        ink: {
          DEFAULT: 'rgb(var(--c-ink) / <alpha-value>)',
          soft:    'rgb(var(--c-ink-soft) / <alpha-value>)',
          muted:   'rgb(var(--c-muted) / <alpha-value>)',
        },
        line:   'rgb(var(--c-line) / <alpha-value>)',
        forest: {
          DEFAULT: 'rgb(var(--c-forest) / <alpha-value>)',
          soft:    'rgb(var(--c-forest-soft) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--c-accent) / <alpha-value>)',
          strong:  'rgb(var(--c-accent-strong) / <alpha-value>)',
          soft:    'rgb(var(--c-accent-soft) / <alpha-value>)',
        },
        success: 'rgb(var(--c-success) / <alpha-value>)',
        warning: 'rgb(var(--c-warning) / <alpha-value>)',
        error:   'rgb(var(--c-error) / <alpha-value>)',
        header:  'rgb(var(--c-header) / <alpha-value>)',
        banner:  'rgb(var(--c-banner) / <alpha-value>)',
        // Government-tech legacy pair (kept for any stragglers)
        gov: {
          orange: '#FF6B1A',
          blue:   '#0B3D91',
        },
      },
      boxShadow: {
        soft:    'var(--shadow-soft)',
        card:    'var(--shadow-card)',
        diffuse: 'var(--shadow-diffuse)',
      },
    },
  },
  plugins: [],
};
