/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans:    ['"Noto Sans KR"', 'sans-serif'],
        display: ['"Bebas Neue"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        brand: {
          50:  '#fff0f6', 100: '#ffd6e7', 200: '#ffa8c8',
          300: '#ff75a8', 400: '#ff4d8d', 500: '#e8175d',
          600: '#c0114d', 700: '#960d3c', 800: '#6e082c', 900: '#46051b',
        },
        ink: {
          DEFAULT: '#0f0f13',
          card:    '#17171e',
          hover:   '#1e1e28',
          line:    '#2a2a38',
        },
      },
      animation: {
        'fade-in':  'fadeIn .4s ease-out',
        'slide-up': 'slideUp .4s ease-out',
        shimmer:    'shimmer 1.8s infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(14px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
    },
  },
  plugins: [],
}
