/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        rota: {
          black: '#0a0a0b',
          dark: '#111113',
          panel: '#161618',
          card: '#1c1c1f',
          border: '#2a2a2e',
          muted: '#6b6b70',
          light: '#9a9aa0',
          white: '#f5f5f7',
          gold: '#c9a227',
          'gold-light': '#e6c54e',
          red: '#8b1a1a',
          'red-light': '#b32626',
          green: '#1f6b3a',
          'green-light': '#2d8f4f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
