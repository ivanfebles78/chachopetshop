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
        // Fondo claro con un pelín de azul (a juego con el logo)
        cream: {
          DEFAULT: '#f6f8fc',
          50: '#fbfcfe',
          100: '#f6f8fc',
          200: '#e7edf7',
        },
        // "brand" = AZUL MARINO del logo Chacho (mismo nombre de token → recolorea toda la web)
        brand: {
          50: '#eef3fb',
          100: '#d7e3f6',
          200: '#adc4ec',
          300: '#7d9fdd',
          400: '#4a72c6',
          500: '#274ea3',
          600: '#16307a',
          700: '#112860',
          800: '#0d1f4b',
          900: '#0a1839',
          950: '#060f26',
        },
        // "amber" = AMARILLO dorado del logo
        amber: {
          400: '#ffce3a',
          500: '#ffc20e',
          600: '#e0a300',
        },
        // Azul claro del logo (acentos)
        sky: {
          400: '#3aa9e6',
          500: '#1f97dd',
          600: '#1580c2',
        },
        ink: '#0c1533',
      },
      boxShadow: {
        soft: '0 2px 8px -2px rgba(12,22,58,0.08), 0 12px 32px -8px rgba(12,22,58,0.12)',
        lift: '0 8px 24px -6px rgba(10,22,60,0.20), 0 24px 48px -12px rgba(10,22,60,0.20)',
        glow: '0 0 0 1px rgba(22,48,122,0.15), 0 20px 60px -12px rgba(22,48,122,0.35)',
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
