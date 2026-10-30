/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(255,255,255,0.09), 0 20px 50px rgba(6,182,212,0.15)',
      },
      backgroundImage: {
        mesh: 'radial-gradient(circle at top, rgba(34,211,238,0.22), transparent 30%), radial-gradient(circle at bottom right, rgba(168,85,247,0.18), transparent 26%)',
      },
    },
  },
  plugins: [],
};
