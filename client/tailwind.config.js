/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#f2f8f3',
          100: '#e3efe5',
          200: '#c7e2cc',
          300: '#a3cdaa',
          400: '#75b183',
          500: '#4c9060',
          600: '#2f6b4a',
          700: '#26563c',
          800: '#1e4531',
          900: '#183829',
        },
        canvas: '#f7faf7',
        leaf: '#e6f2e7',
        ink: '#182b21',
        muted: '#61736a',
        line: '#e3ebe4',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(24, 43, 33, 0.04), 0 8px 24px rgba(24, 43, 33, 0.05)',
        lift: '0 12px 32px rgba(24, 43, 33, 0.10)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
