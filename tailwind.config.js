/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'sand-light': '#F8F6F2',
        'ocean-deep': '#1E2D38',
        'coral-flow': '#E08585',
        'coral-mist': '#F2D1D1',
        'aqua-calm': '#7FA9A4',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
