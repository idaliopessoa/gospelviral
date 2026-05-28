/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F5F1EA',
        evangelization: '#B95D3F',
        edification: '#3F6BB9',
        hybrid: '#7A6A4F',
        scripture: '#F4C04A',
      },
      fontFamily: {
        display: ['"Instrument Serif"', 'serif'],
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
