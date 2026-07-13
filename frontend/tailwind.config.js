/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        accent: {
          DEFAULT: '#7c3aed',
          light: '#8b5cf6',
        },
      },
      animation: {
        shimmer: 'shimmer 1.4s ease infinite',
        spin: 'spin 0.7s linear infinite',
      },
    },
  },
  plugins: [],
}
