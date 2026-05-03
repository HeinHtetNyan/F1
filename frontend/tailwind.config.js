/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:       'var(--bg)',
        panel:    'var(--panel)',
        panel2:   'var(--panel2)',
        border:   'var(--border)',
        border2:  'var(--border2)',
        f1red:    '#FF1801',
        f1green:  '#00FF87',
        f1purple: '#9B59FF',
        f1yellow: '#FFC906',
        f1blue:   '#0093CC',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
        ui:   ['Barlow Condensed', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
