import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        cream: {
          DEFAULT: '#faf6ef',
          50: '#fdfbf7',
          100: '#faf6ef',
          200: '#f2e9da',
        },
        brand: {
          50: '#edfcf3',
          100: '#d4f7e0',
          200: '#abedc6',
          300: '#73dca5',
          400: '#3cc37f',
          500: '#18a862',
          600: '#0c874e',
          700: '#0a6b41',
          800: '#0b5536',
          900: '#0a462e',
          950: '#04271a',
        },
        amber: {
          400: '#f7b733',
          500: '#f59e0b',
          600: '#d97e06',
        },
        ink: '#16211c',
      },
      boxShadow: {
        soft: '0 2px 8px -2px rgba(16,40,28,0.08), 0 12px 32px -8px rgba(16,40,28,0.12)',
        lift: '0 8px 24px -6px rgba(10,70,46,0.18), 0 24px 48px -12px rgba(10,70,46,0.18)',
        glow: '0 0 0 1px rgba(24,168,98,0.15), 0 20px 60px -12px rgba(24,168,98,0.35)',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      keyframes: {
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-12px)' } },
        'fade-up': { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        blob: {
          '0%,100%': { transform: 'translate(0,0) scale(1)' },
          '33%': { transform: 'translate(30px,-40px) scale(1.1)' },
          '66%': { transform: 'translate(-20px,20px) scale(0.95)' },
        },
      },
      animation: {
        marquee: 'marquee 32s linear infinite',
        float: 'float 6s ease-in-out infinite',
        'fade-up': 'fade-up 0.6s cubic-bezier(0.16,1,0.3,1) both',
        blob: 'blob 18s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
