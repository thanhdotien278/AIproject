/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./frontend/views/**/*.ejs",
    "./frontend/public/js/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        'brand-blue': '#0056b3',
        'brand-light': '#f0f8ff',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '128': '32rem',
      },
    },
  },
  plugins: [],
} 