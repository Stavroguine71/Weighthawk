import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0b1020',
        panel: '#121933',
        panel2: '#1a2247',
        accent: '#7c9cff',
        accent2: '#4ade80',
        warn: '#f59e0b',
        danger: '#ef4444',
        muted: '#8a94c1',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
