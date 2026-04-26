/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1B2A4A',
          50:  '#e8ecf3',
          100: '#c6d0e2',
          200: '#9aaece',
          300: '#6d8bba',
          400: '#4b70a9',
          500: '#1B2A4A',
          600: '#172440',
          700: '#121d35',
          800: '#0d162a',
          900: '#080e1c',
        },
        gold: {
          DEFAULT: '#C5A55A',
          50:  '#fdf8ee',
          100: '#f7eed3',
          200: '#efd9a3',
          300: '#e6c36e',
          400: '#C5A55A',
          500: '#b8913c',
          600: '#9a7830',
          700: '#7c5f26',
          800: '#5e471d',
          900: '#402f13',
        },
      },
      fontFamily: {
        heading: ['Georgia', 'serif'],
        body: ['Calibri', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        code: ['Fira Code', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
