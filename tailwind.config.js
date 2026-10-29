/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9eaff',
          500: '#2f6fdb',
          600: '#1f5bc4',
          700: '#1a4a9e',
        },
      },
    },
  },
  plugins: [],
};
